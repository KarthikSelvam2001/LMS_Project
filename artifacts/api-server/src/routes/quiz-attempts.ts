import { Router, type Response } from "express";
import { QuizAttempt, Quiz, Leaderboard, Enrollment, LessonProgress, Course, Lesson } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";
import { updateEnrollmentProgress, checkAndGenerateCertificate } from "./progress";

const router = Router();

router.get("/quiz-attempts", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { quizId } = req.query as Record<string, string>;
    const query: any = { isDeleted: { $ne: true } };
    
    if (user.roleId === "LEARNER") {
      const enrollment = await Enrollment.findOne({ userId: user.id });
      if (!enrollment) return res.json([]);
      query.enrollmentId = enrollment._id;
    }
    
    if (quizId) query.quizId = quizId;

    const attempts = await QuizAttempt.find(query).sort({ createdAt: -1 });
    return res.json(attempts);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch attempts" });
  }
});

router.post("/quiz-attempts", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { quizId, answers = [] } = req.body;
    if (!quizId) return res.status(400).json({ message: "Quiz ID required" });

    const quiz = await Quiz.findById(quizId).populate("lessonId");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const lesson: any = quiz.lessonId;
    if (!lesson) return res.status(404).json({ message: "Lesson not found for this quiz" });

    // find enrollment by courseId from lesson's module
    const populatedLesson = await Lesson.findById(lesson._id).populate({
        path: 'moduleId',
        select: 'courseId'
    });
    
    if (!populatedLesson?.moduleId) return res.status(404).json({ message: "Course context not found for this lesson" });
    const courseId = (populatedLesson.moduleId as any).courseId;
    
    const activeEnrollment = await Enrollment.findOne({ userId: user.id, courseId, isDeleted: { $ne: true } });
    if (!activeEnrollment) return res.status(403).json({ message: "You are not enrolled in this course" });

    const questions = quiz.questions as any[] || [];
    let correctCount = 0;
    const userAnswers = answers as any[] || [];

    questions.forEach((q, idx) => {
      const ua = userAnswers.find(a => a.questionIndex === idx);
      if (ua && String(ua.answer) === String(q.answer)) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passingScore = 60; // Default passing score
    const passed = score >= passingScore;

    // Calculate attempt number
    const previousAttemptsCount = await QuizAttempt.countDocuments({ 
      userId: user.id, 
      quizId 
    });
    const attemptNumber = previousAttemptsCount + 1;

    const attempt = await QuizAttempt.create({
      userId: user.id,
      enrollmentId: activeEnrollment._id,
      quizId,
      answers,
      score,
      totalQuestions,
      passingScore,
      passed,
      isPassed: passed,
      attemptNumber,
    });

    // Update Lesson Progress
    let progress = await LessonProgress.findOne({ userId: user.id, lessonId: lesson._id });
    if (!progress) {
        progress = new LessonProgress({
            userId: user.id,
            courseId,
            lessonId: lesson._id,
            isQuizPassed: passed,
            status: "IN_PROGRESS"
        });
    } else {
        if (passed) progress.isQuizPassed = true;
    }

    // A lesson is completed if watched and quiz passed (if quiz exists)
    if (progress.isWatched && progress.isQuizPassed) {
        progress.status = "COMPLETED";
    }
    await progress.save();

    if (progress.status === "COMPLETED") {
        await updateEnrollmentProgress(user.id, String(courseId));
        await checkAndGenerateCertificate(user.id, String(courseId));
    } else {
        // Even if not 100% progress, we might have just passed the last quiz 
        // while lessons were already done.
        await checkAndGenerateCertificate(user.id, String(courseId));
    }

    // Leaderboard update on pass
    if (passed) {
      await Leaderboard.findOneAndUpdate(
        { userId: user.id },
        { $inc: { score: 10 } },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json(attempt);
  } catch (err) {
    console.error("Quiz submission error:", err);
    return res.status(500).json({ message: "Failed to submit quiz attempt" });
  }
});

export default router;
