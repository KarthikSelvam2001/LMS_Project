import { Router, type Response } from "express";
import { Certificate, LessonProgress, Enrollment, Lesson, Module, Quiz, User, QuizAttempt, Course } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";
import { generateCertificatePDF } from "../lib/pdf-service";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const router = Router();

// Internal helper to check and generate certificate
export async function checkAndGenerateCertificate(userId: string, courseId: string, force: boolean = false) {
  try {
    fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Attempting cert for user ${userId} course ${courseId} force=${force}\n`);
    const enrollment = await Enrollment.findOne({ userId, courseId, isDeleted: { $ne: true } });
    if (!enrollment) {
        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] No enrollment found for userId ${userId} courseId ${courseId}\n`);
        return;
    }
    fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Enrollment found. ID: ${enrollment._id}, Progress: ${enrollment.progress}, Status: ${enrollment.status}\n`);
    if (enrollment.progress < 100) {
        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Skipping: Progress < 100 (${enrollment.progress})\n`);
        return;
    }

    // Check if all quizzes are passed
    if (!force) {
        const courseQuizzes = await Quiz.find({ 
          lessonId: { $in: await Lesson.find({ 
            moduleId: { $in: await Module.find({ courseId, isDeleted: { $ne: true } }).distinct('_id') },
            isDeleted: { $ne: true }
          }).distinct('_id') },
          isDeleted: { $ne: true }
        });

        if (courseQuizzes.length > 0) {
        const uniquePassedQuizzes = await QuizAttempt.distinct('quizId', {
          userId,
          quizId: { $in: courseQuizzes.map(q => q._id) },
          isPassed: true
        });

        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Quizzes: ${uniquePassedQuizzes.length}/${courseQuizzes.length} passed\n`);
        if (uniquePassedQuizzes.length < courseQuizzes.length) {
          return;
        }
      }
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({ learnerId: userId, courseId });
    if (existing) {
        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Certificate ALREADY EXISTS: ${existing.certificateId}\n`);
        return;
    }

    // Generate Certificate
    fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Fetching course/user to generate PDF...\n`);
    const user = await User.findById(userId);
    const course = await Course.findById(courseId).populate('trainerId');
    if (!user || !course) {
        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] User or Course not found in DB\n`);
        return;
    }

    const trainer = course.trainerId as any;
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : "LMS Instructor";
    const certificateId = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
    const fileName = `${certificateId}.pdf`;
    
    // Ensure public/certificates exists
    const certDir = path.join(process.cwd(), "public", "certificates");
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    
    const filePath = path.join(certDir, fileName);
    const completionDate = (enrollment as any).completedAt || new Date();

    fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Generating PDF at ${filePath}\n`);
    await generateCertificatePDF({
      learnerName: `${user.firstName} ${user.lastName}`,
      courseName: course.title || "Unknown Course",
      trainerName,
      completionDate: completionDate.toLocaleDateString(),
      certificateId
    }, filePath);

    const certificateUrl = `/api/certificates/download/${fileName}`;

    await Certificate.create({
      learnerId: userId,
      courseId,
      certificateId,
      issuedAt: new Date(),
      completionDate,
      score: 100,
      certificateUrl
    });

    fs.appendFileSync('/tmp/lms_debug.log', `[${new Date().toISOString()}] Certificate record created for ${certificateId}\n`);
  } catch (err: any) {
    fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] ERROR: ${err.message}\n${err.stack}\n`);
  }
}

// Internal helper to update overall enrollment progress
export async function updateEnrollmentProgress(userId: string, courseId: string) {
  try {
    const totalLessons = await Lesson.countDocuments({ 
      moduleId: { $in: await Module.find({ courseId, isDeleted: { $ne: true } }).distinct('_id') },
      isDeleted: { $ne: true }
    });

    if (totalLessons === 0) return;

    const completedProgress = await LessonProgress.countDocuments({
      userId,
      courseId,
      status: "COMPLETED"
    });

    const progressPercent = Math.round((completedProgress / totalLessons) * 100);
    
    const updatedEnrollment = await Enrollment.findOneAndUpdate(
      { userId, courseId, isDeleted: { $ne: true } },
      { 
        progress: progressPercent,
        status: progressPercent === 100 ? "COMPLETED" : "ACTIVE",
        completedAt: progressPercent === 100 ? new Date() : undefined
      },
      { new: true }
    );

    if (progressPercent === 100) {
      await checkAndGenerateCertificate(userId, courseId);
    }
  } catch (err) {
    console.error("Failed to update enrollment progress:", err);
  }
}

// Track lesson watched
router.post("/lessons/:lessonId/watch", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId).populate("moduleId");
    if (!lesson || !lesson.moduleId) return res.status(404).json({ message: "Lesson not found" });

    const courseId = (lesson.moduleId as any).courseId;

    let progress = await LessonProgress.findOne({ userId: user.id, lessonId });
    
    if (!progress) {
      progress = new LessonProgress({
        userId: user.id,
        courseId,
        lessonId,
        isWatched: true,
        status: "IN_PROGRESS"
      });
    } else {
      progress.isWatched = true;
    }

    // Check if this lesson has a quiz. If not, watching completes it.
    const quiz = await Quiz.findOne({ lessonId, isDeleted: { $ne: true } });
    if (!quiz) {
      progress.status = "COMPLETED";
    } else if (progress.isQuizPassed) {
      progress.status = "COMPLETED";
    }

    await progress.save();
    
    if (progress.status === "COMPLETED") {
      await updateEnrollmentProgress(user.id, String(courseId));
    }

    return res.json(progress);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update watch progress" });
  }
});

// Get user progress for a course summary
router.get("/courses/:courseId", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { courseId } = req.params;
    
    // Count total lessons in course
    const totalLessons = await Lesson.countDocuments({ 
      moduleId: { $in: await Module.find({ courseId, isDeleted: { $ne: true } }).distinct('_id') },
      isDeleted: { $ne: true }
    });

    const completedLessons = await LessonProgress.countDocuments({
      userId: user.id,
      courseId,
      status: "COMPLETED"
    });

    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return res.json({
      completedLessons,
      totalLessons,
      completionPercentage
    });
  } catch (err) {
    console.error("Progress summary error:", err);
    return res.status(500).json({ message: "Failed to fetch progress summary" });
  }
});

// Get detailed lesson progress list (optional, but keep for UI help if needed or just replace)
router.get("/courses/:courseId/details", async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });
  
      const { courseId } = req.params;
      const progress = await LessonProgress.find({ userId: user.id, courseId });
  
      return res.json(progress);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch detailed progress" });
    }
});

export default router;
