import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/leaderboard", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT l.user_id, l.points, u.first_name, u.last_name, u.email,
             RANK() OVER (ORDER BY l.points DESC) as rank
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      WHERE u.is_active = true AND u.is_deleted = false
      ORDER BY l.points DESC
      LIMIT 50
    `);

    res.json(result.rows.map((r: any) => ({
      rank: parseInt(r.rank),
      userId: r.user_id,
      fullName: `${r.first_name} ${r.last_name}`,
      email: r.email,
      points: r.points,
    })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;
