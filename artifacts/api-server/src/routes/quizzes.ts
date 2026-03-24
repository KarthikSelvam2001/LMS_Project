import { Router, type Response } from "express";
import { Quiz, mongoose } from "@workspace/db";
import { AuthRequest, authorize } from "../middlewares/auth";

const router = Router();

function fmt(q: any) {
  return { ...q.toObject(), id: q._id };
}

router.get("/quizzes", async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.query as Record<string, string>;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    console.log("[quizzes] GET /quizzes lessonId:", lessonId);

    const quiz = await Quiz.findOne({ lessonId: new mongoose.Types.ObjectId(lessonId), isDeleted: { $ne: true } });
    if (!quiz) return res.json(null);
    return res.json(fmt(quiz));
  } catch (err) {
    console.error("[quizzes] error:", err);
    return res.status(500).json({ message: "Failed to fetch quiz" });
  }
});

router.post("/quizzes", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId, title = "Lesson Quiz", questions = [] } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    const lessonOid = new mongoose.Types.ObjectId(lessonId);

    const existing = await Quiz.findOne({ lessonId: lessonOid, isDeleted: { $ne: true } });
    if (existing) {
      return res.status(400).json({ message: "Quiz already exists for this lesson. Use PUT to update." });
    }

    const quiz = await Quiz.create({
      lessonId: lessonOid,
      title,
      questions,
    });

    return res.status(201).json(fmt(quiz));
  } catch (err) {
    console.error("[quizzes] create error:", err);
    return res.status(500).json({ message: "Failed to create quiz" });
  }
});

router.get("/quizzes/:id", async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    return res.json(fmt(quiz));
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch quiz" });
  }
});

router.put("/quizzes/:id", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const { title, questions } = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, questions },
      { new: true }
    );

    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    return res.json(fmt(quiz));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update quiz" });
  }
});

router.delete("/quizzes/:id", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    return res.json({ message: "Quiz deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete quiz" });
  }
});

export default router;
