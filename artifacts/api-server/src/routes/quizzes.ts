import { Router, type IRouter } from "express";
import { db, quizzesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function fmt(q: typeof quizzesTable.$inferSelect) {
  return { ...q, questions: q.questions as any[], createdAt: q.createdAt.toISOString(), updatedAt: q.updatedAt.toISOString() };
}

router.get("/quizzes", async (req, res) => {
  try {
    const { lessonId } = req.query as Record<string, string>;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, parseInt(lessonId)));
    if (!quiz) return res.json(null);
    res.json(fmt(quiz));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch quiz" });
  }
});

router.post("/quizzes", async (req, res) => {
  try {
    const { lessonId, title = "Lesson Quiz", questions = [] } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    const existing = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, parseInt(lessonId)));
    if (existing.length > 0) {
      return res.status(400).json({ message: "Quiz already exists for this lesson. Use PUT to update." });
    }

    const [quiz] = await db.insert(quizzesTable).values({
      lessonId: parseInt(lessonId),
      title,
      questions,
    }).returning();

    res.status(201).json(fmt(quiz));
  } catch (err) {
    res.status(500).json({ message: "Failed to create quiz" });
  }
});

router.get("/quizzes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(fmt(quiz));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch quiz" });
  }
});

router.put("/quizzes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, questions } = req.body;

    const [quiz] = await db.update(quizzesTable)
      .set({ title, questions, updatedAt: new Date() })
      .where(eq(quizzesTable.id, id))
      .returning();

    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(fmt(quiz));
  } catch (err) {
    res.status(500).json({ message: "Failed to update quiz" });
  }
});

router.delete("/quizzes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(quizzesTable).where(eq(quizzesTable.id, id));
    res.json({ message: "Quiz deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete quiz" });
  }
});

export default router;
