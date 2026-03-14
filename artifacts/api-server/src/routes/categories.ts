import { Router, type IRouter } from "express";
import { db, categoriesTable, coursesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const countResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM courses WHERE category_id = ${cat.id}`);
        return {
          ...cat,
          courseCount: (countResult.rows[0] as any)?.count ?? 0,
        };
      })
    );
    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const [cat] = await db.insert(categoriesTable).values({ name, description, color }).returning();
    res.status(201).json({ ...cat, courseCount: 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to create category" });
  }
});

export default router;
