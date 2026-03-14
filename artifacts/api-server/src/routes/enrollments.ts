import { Router, type IRouter } from "express";
import { db, enrollmentsTable, usersTable, coursesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/enrollments", async (req, res) => {
  try {
    const { userId, courseId, status } = req.query as Record<string, string>;
    const conditions: any[] = [];

    if (userId) conditions.push(eq(enrollmentsTable.userId, parseInt(userId)));
    if (courseId) conditions.push(eq(enrollmentsTable.courseId, parseInt(courseId)));
    if (status && ["ACTIVE", "COMPLETED", "DROPPED"].includes(status)) {
      conditions.push(eq(enrollmentsTable.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const enrollments = await db.select().from(enrollmentsTable).where(whereClause).orderBy(enrollmentsTable.enrolledAt);

    const withDetails = await Promise.all(
      enrollments.map(async (e) => {
        const [userRes, courseRes] = await Promise.all([
          db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, e.userId)),
          db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, e.courseId)),
        ]);
        return {
          ...e,
          enrolledAt: e.enrolledAt.toISOString(),
          completedAt: e.completedAt ? e.completedAt.toISOString() : null,
          userName: userRes[0]?.name ?? null,
          userEmail: userRes[0]?.email ?? null,
          courseTitle: courseRes[0]?.title ?? null,
        };
      })
    );

    res.json(withDetails);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

router.post("/enrollments", async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) return res.status(400).json({ message: "userId and courseId required" });

    const [enrollment] = await db.insert(enrollmentsTable).values({
      userId: parseInt(userId),
      courseId: parseInt(courseId),
      status: "ACTIVE",
      progress: 0,
    }).returning();

    const [userRes, courseRes] = await Promise.all([
      db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, enrollment.userId)),
      db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, enrollment.courseId)),
    ]);

    res.status(201).json({
      ...enrollment,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedAt: null,
      userName: userRes[0]?.name ?? null,
      userEmail: userRes[0]?.email ?? null,
      courseTitle: courseRes[0]?.title ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create enrollment" });
  }
});

router.patch("/enrollments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, progress } = req.body;

    const updates: any = {};
    if (status) updates.status = status;
    if (progress !== undefined) updates.progress = progress;
    if (status === "COMPLETED") updates.completedAt = new Date();

    const [enrollment] = await db.update(enrollmentsTable)
      .set(updates)
      .where(eq(enrollmentsTable.id, id))
      .returning();

    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    const [userRes, courseRes] = await Promise.all([
      db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, enrollment.userId)),
      db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, enrollment.courseId)),
    ]);

    res.json({
      ...enrollment,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
      userName: userRes[0]?.name ?? null,
      userEmail: userRes[0]?.email ?? null,
      courseTitle: courseRes[0]?.title ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update enrollment" });
  }
});

export default router;
