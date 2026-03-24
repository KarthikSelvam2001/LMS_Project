import { Router, type Response } from "express";
import { User, Course, Enrollment, Module, Lesson, Quiz, Certificate, Leaderboard } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/stats", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id: userId, roleId: role } = user;

    // Admin dashboard
    if (role === "ADMIN") {
      const [
        totalUsers,
        totalTrainers,
        totalLearners,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        totalModules,
        totalLessons,
        totalQuizzes
      ] = await Promise.all([
        User.countDocuments({ isDeleted: false }),
        User.countDocuments({ roleId: "TRAINER", isDeleted: false }),
        User.countDocuments({ roleId: "LEARNER", isDeleted: false }),
        Course.countDocuments({ isDeleted: { $ne: true } }),
        Course.countDocuments({ status: "PUBLISHED", isDeleted: { $ne: true } }),
        Enrollment.countDocuments({ isDeleted: { $ne: true } }),
        Enrollment.countDocuments({ status: "COMPLETED", isDeleted: { $ne: true } }),
        Module.countDocuments({ isDeleted: { $ne: true } }),
        Lesson.countDocuments({ isDeleted: { $ne: true } }),
        Quiz.countDocuments({ isDeleted: { $ne: true } }),
      ]);

      return res.json({
        role: "ADMIN",
        totalUsers,
        totalTrainers,
        totalLearners,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        totalModules,
        totalLessons,
        totalQuizzes,
      });
    }

    // Trainer dashboard
    if (role === "TRAINER") {
      const myCourses = await Course.find({ trainerId: userId, isDeleted: { $ne: true } });
      const myCourseIds = myCourses.map(c => c._id);

      const [
        publishedCount,
        totalStudents,
        totalLessons,
      ] = await Promise.all([
        Course.countDocuments({ trainerId: userId, status: "PUBLISHED", isDeleted: { $ne: true } }),
        Enrollment.distinct('userId', { courseId: { $in: myCourseIds }, isDeleted: { $ne: true } }).then(ids => ids.length),
        Lesson.countDocuments({ 
          moduleId: { $in: await Module.find({ courseId: { $in: myCourseIds }, isDeleted: { $ne: true } }).distinct('_id') },
          isDeleted: { $ne: true }
        }),
      ]);

      return res.json({
        role: "TRAINER",
        totalCourses: myCourses.length,
        publishedCourses: publishedCount,
        totalStudents,
        totalLessons,
        averageRating: "0.0",
      });
    }

    // Learner dashboard
    if (role === "LEARNER") {
      const [enrolledCount, completedCount, lbEntry] = await Promise.all([
        Enrollment.countDocuments({ userId, isDeleted: { $ne: true } }),
        Enrollment.countDocuments({ userId, status: "COMPLETED", isDeleted: { $ne: true } }),
        Leaderboard.findOne({ userId }),
      ]);

      const inProgressCount = enrolledCount - completedCount;

      return res.json({
        role: "LEARNER",
        enrolledCourses: enrolledCount,
        completedCourses: completedCount,
        inProgressCourses: inProgressCount,
        points: lbEntry ? lbEntry.score : 0,
        myCourses: enrolledCount, // Adding these for consistency with learner-stats if requested
        pointsEarned: lbEntry ? lbEntry.score : 0
      });
    }

    return res.status(403).json({ message: "Invalid role for stats" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// New specific route for learner stats as requested in Issue 5
router.get("/dashboard/learner-stats", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.roleId !== "LEARNER") return res.status(403).json({ message: "Forbidden" });

    const userId = user.id;

    const [enrollments, lbEntry] = await Promise.all([
      Enrollment.find({ userId, isDeleted: { $ne: true } }),
      Leaderboard.findOne({ userId }),
    ]);

    const myCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.status === "COMPLETED").length;
    const inProgressCourses = myCourses - completedCourses;
    const pointsEarned = lbEntry ? lbEntry.score : 0;

    return res.json({
      myCourses,
      completedCourses,
      inProgressCourses,
      pointsEarned
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch learner stats" });
  }
});

router.get("/dashboard/recent-enrollments", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const query: any = { isDeleted: { $ne: true } };
    
    // If trainer, limit to their courses
    if (user.roleId === "TRAINER") {
      const myCourseIds = await Course.find({ trainerId: user.id, isDeleted: { $ne: true } }).distinct('_id');
      query.courseId = { $in: myCourseIds };
    }
    
    // If learner, limit to their own enrollments (Issue 8)
    if (user.roleId === "LEARNER") {
      query.userId = user.id;
    }

    const enrollmentsRaw = await Enrollment.find(query)
      .populate("userId", "firstName lastName")
      .populate("courseId", "title")
      .sort({ enrolledAt: -1 })
      .limit(5);

    const enrollments = enrollmentsRaw.map((e: any) => ({
      id: e._id,
      userName: e.userId ? `${e.userId.firstName} ${e.userId.lastName}` : "Unknown",
      courseTitle: e.courseId ? e.courseId.title : "Unknown",
      enrolledAt: e.enrolledAt,
      progress: e.progress,
      status: e.status,
    }));

    return res.json(enrollments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch recent enrollments" });
  }
});

router.get("/dashboard/popular-courses", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const query: any = { status: "PUBLISHED", isDeleted: { $ne: true } };
    
    if (user.roleId === "TRAINER") {
      query.trainerId = user.id;
    }

    const courses = await Course.find(query)
      .populate("trainerId", "firstName lastName")
      .populate("categoryId", "name")
      .limit(10); // Find more to filter properly

    const popular = await Promise.all(
      courses.map(async (c: any) => {
        const studentCount = await Enrollment.countDocuments({ courseId: c._id, isDeleted: { $ne: true } });
        return {
          id: c._id,
          title: c.title,
          level: c.level || "BEGINNER",
          categoryName: c.categoryId ? c.categoryId.name : "Uncategorized",
          trainerName: c.trainerId ? `${c.trainerId.firstName} ${c.trainerId.lastName}` : "Unknown",
          enrollmentCount: studentCount,
          rating: 0,
        };
      })
    );
    
    popular.sort((a, b) => b.enrollmentCount - a.enrollmentCount);

    return res.json(popular.slice(0, 5));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch popular courses" });
  }
});

export default router;
