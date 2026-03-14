import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const { userId, role } = req.query as Record<string, string>;

    // Admin dashboard
    if (!userId || role === "ADMIN") {
      const [users, trainers, learners, courses, publishedCourses, enrollments, completedEnrollments, modules, lessons, quizzes] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int as count FROM users WHERE is_deleted = false`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM users WHERE role_id = 'TRAINER' AND is_deleted = false`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM users WHERE role_id = 'LEARNER' AND is_deleted = false`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM courses`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM courses WHERE status = 'PUBLISHED'`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM enrollments`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM enrollments WHERE status = 'COMPLETED'`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM modules`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM lessons`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM quizzes`),
      ]);

      return res.json({
        role: "ADMIN",
        totalUsers: (users.rows[0] as any)?.count ?? 0,
        totalTrainers: (trainers.rows[0] as any)?.count ?? 0,
        totalLearners: (learners.rows[0] as any)?.count ?? 0,
        totalCourses: (courses.rows[0] as any)?.count ?? 0,
        publishedCourses: (publishedCourses.rows[0] as any)?.count ?? 0,
        totalEnrollments: (enrollments.rows[0] as any)?.count ?? 0,
        completedEnrollments: (completedEnrollments.rows[0] as any)?.count ?? 0,
        totalModules: (modules.rows[0] as any)?.count ?? 0,
        totalLessons: (lessons.rows[0] as any)?.count ?? 0,
        totalQuizzes: (quizzes.rows[0] as any)?.count ?? 0,
      });
    }

    const uid = parseInt(userId);

    // Trainer dashboard
    if (role === "TRAINER") {
      const [myCourses, totalStudents, publishedCourses, ratings] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int as count FROM courses WHERE trainer_id = ${uid}`),
        db.execute(sql`SELECT COUNT(DISTINCT e.user_id)::int as count FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE c.trainer_id = ${uid}`),
        db.execute(sql`SELECT COUNT(*)::int as count FROM courses WHERE trainer_id = ${uid} AND status = 'PUBLISHED'`),
        db.execute(sql`SELECT COALESCE(AVG(rating), 0)::float as avg FROM course_ratings cr JOIN courses c ON cr.course_id = c.id WHERE c.trainer_id = ${uid}`).catch(() => [{ rows: [{ avg: 0 }] }]),
      ]);

      const recentEnrollments = await db.execute(sql`
        SELECT e.id, u.first_name, u.last_name, c.title as course_title, e.enrolled_at, e.progress
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE c.trainer_id = ${uid}
        ORDER BY e.enrolled_at DESC
        LIMIT 5
      `);

      return res.json({
        role: "TRAINER",
        totalCourses: (myCourses.rows[0] as any)?.count ?? 0,
        publishedCourses: (publishedCourses.rows[0] as any)?.count ?? 0,
        totalStudents: (totalStudents.rows[0] as any)?.count ?? 0,
        averageRating: parseFloat((ratings as any).rows?.[0]?.avg ?? 0).toFixed(1),
        recentEnrollments: recentEnrollments.rows.map((r: any) => ({
          id: r.id,
          learnerName: `${r.first_name} ${r.last_name}`,
          courseTitle: r.course_title,
          enrolledAt: r.enrolled_at,
          progress: r.progress,
        })),
      });
    }

    // Learner dashboard
    const [enrolledCourses, completedCourses, certificates, totalPoints] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int as count FROM enrollments WHERE user_id = ${uid}`),
      db.execute(sql`SELECT COUNT(*)::int as count FROM enrollments WHERE user_id = ${uid} AND status = 'COMPLETED'`),
      db.execute(sql`SELECT COUNT(*)::int as count FROM certificates WHERE user_id = ${uid}`),
      db.execute(sql`SELECT COALESCE(points, 0) as points FROM leaderboard WHERE user_id = ${uid}`),
    ]);

    const myCourses = await db.execute(sql`
      SELECT e.id, c.title, e.status, e.progress, e.enrolled_at,
             u.first_name as trainer_first, u.last_name as trainer_last
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.trainer_id = u.id
      WHERE e.user_id = ${uid}
      ORDER BY e.enrolled_at DESC
      LIMIT 5
    `);

    return res.json({
      role: "LEARNER",
      enrolledCourses: (enrolledCourses.rows[0] as any)?.count ?? 0,
      completedCourses: (completedCourses.rows[0] as any)?.count ?? 0,
      certificates: (certificates.rows[0] as any)?.count ?? 0,
      points: (totalPoints.rows[0] as any)?.points ?? 0,
      myCourses: myCourses.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        progress: r.progress,
        enrolledAt: r.enrolled_at,
        trainerName: r.trainer_first ? `${r.trainer_first} ${r.trainer_last}` : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

export default router;
