import { Router, type IRouter } from "express";
import { Attendance, Leaderboard, Enrollment, Module, Lesson } from "@workspace/db";

const router: IRouter = Router();

router.get("/attendance", async (req, res) => {
  try {
    const { userId, courseId } = req.query as Record<string, string>;
    const query: any = {};
    if (userId) query.userId = userId;
    if (courseId) query.courseId = courseId;

    const records = await Attendance.find(query);
    res.json(records.map(r => ({ ...r.toObject(), id: r._id })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

router.post("/attendance", async (req, res) => {
  try {
    const { userId, lessonId, courseId, status = "IN_PROGRESS" } = req.body;
    if (!userId || !lessonId || !courseId) {
      return res.status(400).json({ message: "userId, lessonId, courseId required" });
    }

    const record = await Attendance.findOneAndUpdate(
      { userId, lessonId },
      { courseId, status, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // Award +5 points for new lesson completion
    if (status === "COMPLETED") {
      await Leaderboard.findOneAndUpdate(
        { userId },
        { $inc: { score: 5 } },
        { upsert: true, new: true }
      );

      // Update enrollment progress
      const modules = await Module.find({ courseId }).select("_id");
      const moduleIds = modules.map(m => m._id);
      
      const [totalLessons, completedLessons] = await Promise.all([
        Lesson.countDocuments({ moduleId: { $in: moduleIds } }),
        Attendance.countDocuments({ userId, courseId, status: "COMPLETED" })
      ]);

      const total = totalLessons || 1;
      const progress = Math.min(100, Math.round((completedLessons / total) * 100));

      await Enrollment.findOneAndUpdate(
        { userId, courseId },
        { progress, status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS" }
      );
    }

    res.status(201).json({ ...record.toObject(), id: record._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record attendance" });
  }
});

export default router;
