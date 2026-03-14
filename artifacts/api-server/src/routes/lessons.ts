import { Router, type IRouter } from "express";
import { db, lessonsTable, quizzesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function fmt(l: typeof lessonsTable.$inferSelect) {
  return { ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() };
}

router.get("/lessons", async (req, res) => {
  try {
    const { moduleId } = req.query as Record<string, string>;
    if (!moduleId) return res.status(400).json({ message: "moduleId required" });

    const lessons = await db.select().from(lessonsTable)
      .where(eq(lessonsTable.moduleId, parseInt(moduleId)))
      .orderBy(lessonsTable.orderIndex);

    const withQuiz = await Promise.all(
      lessons.map(async (l) => {
        const [quiz] = await db.select({ id: quizzesTable.id, title: quizzesTable.title })
          .from(quizzesTable).where(eq(quizzesTable.lessonId, l.id));
        return { ...fmt(l), quiz: quiz ?? null };
      })
    );

    res.json(withQuiz);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch lessons" });
  }
});

router.post("/lessons", async (req, res) => {
  try {
    const { moduleId, title, description, videoUrl, duration, orderIndex = 0 } = req.body;
    if (!moduleId || !title) return res.status(400).json({ message: "moduleId and title required" });

    const [l] = await db.insert(lessonsTable).values({
      moduleId: parseInt(moduleId),
      title,
      description,
      videoUrl,
      duration,
      orderIndex,
    }).returning();

    res.status(201).json({ ...fmt(l), quiz: null });
  } catch (err) {
    res.status(500).json({ message: "Failed to create lesson" });
  }
});

router.get("/lessons/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [l] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id));
    if (!l) return res.status(404).json({ message: "Lesson not found" });

    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, id));
    res.json({ ...fmt(l), quiz: quiz ? { ...quiz, createdAt: quiz.createdAt.toISOString(), updatedAt: quiz.updatedAt.toISOString() } : null });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch lesson" });
  }
});

router.put("/lessons/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, videoUrl, duration, orderIndex } = req.body;

    const [l] = await db.update(lessonsTable)
      .set({ title, description, videoUrl, duration, orderIndex, updatedAt: new Date() })
      .where(eq(lessonsTable.id, id))
      .returning();

    if (!l) return res.status(404).json({ message: "Lesson not found" });
    res.json(fmt(l));
  } catch (err) {
    res.status(500).json({ message: "Failed to update lesson" });
  }
});

router.delete("/lessons/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
    res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete lesson" });
  }
});

export default router;
