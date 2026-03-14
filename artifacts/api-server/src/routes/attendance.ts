import { Router, type IRouter } from "express";
import { db, attendanceTable, leaderboardTable, enrollmentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/attendance", async (req, res) => {
  try {
    const { userId, courseId } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (userId) conditions.push(eq(attendanceTable.userId, parseInt(userId)));
    if (courseId) conditions.push(eq(attendanceTable.courseId, parseInt(courseId)));

    const records = await db.select().from(attendanceTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
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

    const uid = parseInt(userId);
    const lid = parseInt(lessonId);
    const cid = parseInt(courseId);

    const existing = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.userId, uid), eq(attendanceTable.lessonId, lid)));

    let record;
    if (existing.length > 0) {
      const [updated] = await db.update(attendanceTable)
        .set({ status: status as any, updatedAt: new Date() })
        .where(and(eq(attendanceTable.userId, uid), eq(attendanceTable.lessonId, lid)))
        .returning();
      record = updated;
    } else {
      const [inserted] = await db.insert(attendanceTable).values({
        userId: uid, lessonId: lid, courseId: cid, status: status as any,
      }).returning();
      record = inserted;

      // Award +5 points for new lesson completion
      if (status === "COMPLETED") {
        const lb = await db.select().from(leaderboardTable).where(eq(leaderboardTable.userId, uid));
        if (lb.length > 0) {
          await db.update(leaderboardTable)
            .set({ points: lb[0].points + 5, updatedAt: new Date() })
            .where(eq(leaderboardTable.userId, uid));
        } else {
          await db.insert(leaderboardTable).values({ userId: uid, points: 5 });
        }
      }
    }

    // Update enrollment progress
    if (status === "COMPLETED") {
      const [totalLessons] = await db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ${cid}`
      ).then(r => r.rows as any[]);
      const [completedLessons] = await db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count FROM attendance WHERE user_id = ${uid} AND course_id = ${cid} AND status = 'COMPLETED'`
      ).then(r => r.rows as any[]);

      const total = totalLessons?.count ?? 1;
      const completed = completedLessons?.count ?? 0;
      const progress = Math.min(100, Math.round((completed / total) * 100));

      await db.update(enrollmentsTable)
        .set({ progress, status: progress >= 100 ? "COMPLETED" : "ACTIVE" })
        .where(and(eq(enrollmentsTable.userId, uid), eq(enrollmentsTable.courseId, cid)));
    }

    res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record attendance" });
  }
});

export default router;
