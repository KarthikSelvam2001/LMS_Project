import { Router, type IRouter } from "express";
import { db, certificatesTable, enrollmentsTable, usersTable, coursesTable, leaderboardTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/certificates", async (req, res) => {
  try {
    const { userId } = req.query as Record<string, string>;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const certs = await db.execute(
      { sql: `SELECT c.*, co.title as course_title, u.first_name, u.last_name FROM certificates c JOIN courses co ON c.course_id = co.id JOIN users u ON c.user_id = u.id WHERE c.user_id = $1`, params: [parseInt(userId)] }
    );

    res.json(certs.rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      courseId: r.course_id,
      courseTitle: r.course_title,
      learnerName: `${r.first_name} ${r.last_name}`,
      certificateUrl: r.certificate_url,
      issuedAt: r.issued_at,
    })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
});

router.post("/certificates/generate", async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) return res.status(400).json({ message: "userId and courseId required" });

    const uid = parseInt(userId);
    const cid = parseInt(courseId);

    const [enrollment] = await db.select().from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, uid), eq(enrollmentsTable.courseId, cid)));

    if (!enrollment || enrollment.progress < 100) {
      return res.status(400).json({ message: "Course not completed yet" });
    }

    const existing = await db.select().from(certificatesTable)
      .where(and(eq(certificatesTable.userId, uid), eq(certificatesTable.courseId, cid)));

    if (existing.length > 0) {
      return res.json({ ...existing[0], issuedAt: existing[0].issuedAt.toISOString(), message: "Certificate already issued" });
    }

    const [cert] = await db.insert(certificatesTable).values({ userId: uid, courseId: cid }).returning();

    // Award +100 points for course completion
    const lb = await db.select().from(leaderboardTable).where(eq(leaderboardTable.userId, uid));
    if (lb.length > 0) {
      await db.update(leaderboardTable)
        .set({ points: lb[0].points + 100, updatedAt: new Date() })
        .where(eq(leaderboardTable.userId, uid));
    } else {
      await db.insert(leaderboardTable).values({ userId: uid, points: 100 });
    }

    res.status(201).json({ ...cert, issuedAt: cert.issuedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate certificate" });
  }
});

export default router;
