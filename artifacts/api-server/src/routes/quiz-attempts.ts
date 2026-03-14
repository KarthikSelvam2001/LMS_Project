import { Router, type IRouter } from "express";
import { db, quizAttemptsTable, quizzesTable, leaderboardTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/quiz-attempts", async (req, res) => {
  try {
    const { userId, quizId } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (userId) conditions.push(eq(quizAttemptsTable.userId, parseInt(userId)));
    if (quizId) conditions.push(eq(quizAttemptsTable.quizId, parseInt(quizId)));

    const attempts = await db.select().from(quizAttemptsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(quizAttemptsTable.createdAt);

    res.json(attempts.map(a => ({ ...a, answers: a.answers as any[], createdAt: a.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attempts" });
  }
});

router.post("/quiz-attempts", async (req, res) => {
  try {
    const { userId, quizId, answers = [] } = req.body;
    if (!userId || !quizId) return res.status(400).json({ message: "userId and quizId required" });

    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, parseInt(quizId)));
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = quiz.questions as Array<{ question: string; options: string[]; answer: string }>;
    const userAnswers = answers as Array<{ questionIndex: number; answer: string }>;

    let correct = 0;
    userAnswers.forEach(ua => {
      if (questions[ua.questionIndex]?.answer === ua.answer) correct++;
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(quizAttemptsTable)
      .where(and(eq(quizAttemptsTable.userId, parseInt(userId)), eq(quizAttemptsTable.quizId, parseInt(quizId))));
    const attemptNumber = (countResult?.count ?? 0) + 1;

    const [attempt] = await db.insert(quizAttemptsTable).values({
      userId: parseInt(userId),
      quizId: parseInt(quizId),
      score,
      attemptNumber,
      answers,
    }).returning();

    // Award leaderboard points (quiz pass = +10)
    if (score >= 60) {
      const existing = await db.select().from(leaderboardTable).where(eq(leaderboardTable.userId, parseInt(userId)));
      if (existing.length > 0) {
        await db.update(leaderboardTable)
          .set({ points: existing[0].points + 10, updatedAt: new Date() })
          .where(eq(leaderboardTable.userId, parseInt(userId)));
      } else {
        await db.insert(leaderboardTable).values({ userId: parseInt(userId), points: 10 });
      }
    }

    res.status(201).json({ ...attempt, answers: attempt.answers as any[], score, attemptNumber, createdAt: attempt.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit quiz attempt" });
  }
});

export default router;
