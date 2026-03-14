import { Router, type IRouter } from "express";
import { db, coursesTable, usersTable, categoriesTable, modulesTable, enrollmentsTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";

const router: IRouter = Router();

async function enrichCourse(course: typeof coursesTable.$inferSelect) {
  const [enrollCount, moduleCount, trainerRes, categoryRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(modulesTable).where(eq(modulesTable.courseId, course.id)),
    course.trainerId
      ? db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, course.trainerId))
      : Promise.resolve([]),
    course.categoryId
      ? db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, course.categoryId))
      : Promise.resolve([]),
  ]);
  const trainer = (trainerRes as any)[0];
  return {
    ...course,
    price: course.price ? parseFloat(course.price) : null,
    enrollmentCount: enrollCount[0]?.count ?? 0,
    moduleCount: moduleCount[0]?.count ?? 0,
    trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : null,
    categoryName: (categoryRes as any)[0]?.name ?? null,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

router.get("/courses", async (req, res) => {
  try {
    const { search, categoryId, status, level, trainerId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (search) conditions.push(ilike(coursesTable.title, `%${search}%`));
    if (categoryId) conditions.push(eq(coursesTable.categoryId, parseInt(categoryId)));
    if (status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) conditions.push(eq(coursesTable.status, status as any));
    if (level && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(level)) conditions.push(eq(coursesTable.level, level as any));
    if (trainerId) conditions.push(eq(coursesTable.trainerId, parseInt(trainerId)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [courses, totalResult] = await Promise.all([
      db.select().from(coursesTable).where(whereClause).limit(limitNum).offset(offset).orderBy(coursesTable.createdAt),
      db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const enriched = await Promise.all(courses.map(enrichCourse));

    res.json({ courses: enriched, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const { title, description, thumbnail, status = "DRAFT", level = "BEGINNER", price, categoryId, trainerId } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const [course] = await db.insert(coursesTable).values({
      title,
      description,
      thumbnail,
      status: status as any,
      level: level as any,
      price: price ? String(price) : null,
      isPublished: status === "PUBLISHED",
      categoryId: categoryId || null,
      trainerId: trainerId || null,
    }).returning();

    res.status(201).json(await enrichCourse(course));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create course" });
  }
});

router.get("/courses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
    if (!course) return res.status(404).json({ message: "Course not found" });

    const modules = await db.select().from(modulesTable)
      .where(eq(modulesTable.courseId, id))
      .orderBy(modulesTable.orderIndex);

    const enriched = await enrichCourse(course);
    res.json({ ...enriched, modules: modules.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch course" });
  }
});

router.put("/courses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, thumbnail, status, level, price, categoryId, trainerId, isPublished } = req.body;

    const [course] = await db.update(coursesTable)
      .set({
        title,
        description,
        thumbnail,
        status: status as any,
        level: level as any,
        price: price !== undefined ? (price ? String(price) : null) : undefined,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : (status === "PUBLISHED" ? true : undefined),
        categoryId: categoryId !== undefined ? (categoryId || null) : undefined,
        trainerId: trainerId !== undefined ? (trainerId || null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(coursesTable.id, id))
      .returning();

    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(await enrichCourse(course));
  } catch (err) {
    res.status(500).json({ message: "Failed to update course" });
  }
});

router.delete("/courses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(coursesTable).where(eq(coursesTable.id, id));
    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete course" });
  }
});

export default router;
