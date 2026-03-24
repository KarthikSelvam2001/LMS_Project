import { Router, type IRouter } from "express";
import { Leaderboard } from "@workspace/db";

const router: IRouter = Router();

router.get("/leaderboard", async (_req, res) => {
  try {
    const leaderboard = await Leaderboard.find()
      .populate("userId", "firstName lastName email isActive isDeleted")
      .sort({ score: -1 })
      .limit(100);

    const filtered = leaderboard
      .filter((l: any) => l.userId && l.userId.isActive && !l.userId.isDeleted)
      .slice(0, 50);

    const result = filtered.map((l: any, index) => ({
      rank: index + 1,
      userId: l.userId._id,
      fullName: `${l.userId.firstName} ${l.userId.lastName}`,
      email: l.userId.email,
      points: l.score,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;
