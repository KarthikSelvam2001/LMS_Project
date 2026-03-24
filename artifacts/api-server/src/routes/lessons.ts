import { Router, type Response } from "express";
import { Lesson, Quiz, mongoose } from "@workspace/db";
import { AuthRequest, authorize } from "../middlewares/auth";

const router = Router();

function fmt(l: any) {
  return { ...l.toObject(), id: l._id };
}

router.get("/lessons", async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.query as Record<string, string>;
    if (!moduleId) return res.status(400).json({ message: "moduleId required" });

    console.log("[lessons] GET /lessons moduleId:", moduleId);

    const lessons = await Lesson.find({ moduleId: new mongoose.Types.ObjectId(moduleId), isDeleted: { $ne: true } }).sort({ orderIndex: 1 });

    console.log("[lessons] found:", lessons.length);

    const withQuiz = await Promise.all(
      lessons.map(async (l) => {
        const quiz = await Quiz.findOne({ lessonId: l._id }).select("title");
        return { ...fmt(l), quiz: quiz ?? null };
      })
    );

    return res.json(withQuiz);
  } catch (err) {
    console.error("[lessons] error:", err);
    return res.status(500).json({ message: "Failed to fetch lessons" });
  }
});

router.post("/lessons", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId, title, description, videoUrl, duration, orderIndex = 0 } = req.body;
    if (!moduleId || !title) return res.status(400).json({ message: "moduleId and title required" });

    const l = await Lesson.create({
      moduleId,
      title,
      description,
      videoUrl,
      duration,
      orderIndex,
    });

    return res.status(201).json({ ...fmt(l), quiz: null });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create lesson" });
  }
});

router.get("/lessons/:id", async (req: AuthRequest, res: Response) => {
  try {
    const l = await Lesson.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!l) return res.status(404).json({ message: "Lesson not found" });

    const quiz = await Quiz.findOne({ lessonId: l._id });
    return res.json({ ...fmt(l), quiz });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch lesson" });
  }
});

router.put("/lessons/:id", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, videoUrl, duration, orderIndex } = req.body;

    const l = await Lesson.findByIdAndUpdate(
      req.params.id,
      { title, description, videoUrl, duration, orderIndex },
      { new: true }
    );

    if (!l) return res.status(404).json({ message: "Lesson not found" });
    return res.json(fmt(l));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update lesson" });
  }
});

router.delete("/lessons/:id", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const l = await Lesson.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!l) return res.status(404).json({ message: "Lesson not found" });
    return res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete lesson" });
  }
});

export default router;
