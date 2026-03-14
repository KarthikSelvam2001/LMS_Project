import { Router, type IRouter } from "express";
import { db, modulesTable, lessonsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function fmt(m: typeof modulesTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() };
}

router.get("/modules", async (req, res) => {
  try {
    const { courseId } = req.query as Record<string, string>;
    if (!courseId) return res.status(400).json({ message: "courseId required" });

    const modules = await db.select().from(modulesTable)
      .where(eq(modulesTable.courseId, parseInt(courseId)))
      .orderBy(modulesTable.orderIndex);

    const withCounts = await Promise.all(
      modules.map(async (m) => {
        const [lc] = await db.select({ count: sql<number>`count(*)::int` }).from(lessonsTable).where(eq(lessonsTable.moduleId, m.id));
        return { ...fmt(m), lessonCount: lc?.count ?? 0 };
      })
    );

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch modules" });
  }
});

router.post("/modules", async (req, res) => {
  try {
    const { courseId, title, description, orderIndex = 0 } = req.body;
    if (!courseId || !title) return res.status(400).json({ message: "courseId and title required" });

    const [m] = await db.insert(modulesTable).values({
      courseId: parseInt(courseId),
      title,
      description,
      orderIndex,
    }).returning();

    res.status(201).json({ ...fmt(m), lessonCount: 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to create module" });
  }
});

router.get("/modules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [m] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
    if (!m) return res.status(404).json({ message: "Module not found" });

    const lessons = await db.select().from(lessonsTable)
      .where(eq(lessonsTable.moduleId, id))
      .orderBy(lessonsTable.orderIndex);

    res.json({
      ...fmt(m),
      lessons: lessons.map(l => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch module" });
  }
});

router.put("/modules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, orderIndex } = req.body;

    const [m] = await db.update(modulesTable)
      .set({ title, description, orderIndex, updatedAt: new Date() })
      .where(eq(modulesTable.id, id))
      .returning();

    if (!m) return res.status(404).json({ message: "Module not found" });
    res.json(fmt(m));
  } catch (err) {
    res.status(500).json({ message: "Failed to update module" });
  }
});

router.delete("/modules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(modulesTable).where(eq(modulesTable.id, id));
    res.json({ message: "Module deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete module" });
  }
});

export default router;
