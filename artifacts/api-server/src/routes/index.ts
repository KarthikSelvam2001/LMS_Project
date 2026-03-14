import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import coursesRouter from "./courses";
import modulesRouter from "./modules";
import lessonsRouter from "./lessons";
import quizzesRouter from "./quizzes";
import quizAttemptsRouter from "./quiz-attempts";
import enrollmentsRouter from "./enrollments";
import attendanceRouter from "./attendance";
import certificatesRouter from "./certificates";
import leaderboardRouter from "./leaderboard";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(coursesRouter);
router.use(modulesRouter);
router.use(lessonsRouter);
router.use(quizzesRouter);
router.use(quizAttemptsRouter);
router.use(enrollmentsRouter);
router.use(attendanceRouter);
router.use(certificatesRouter);
router.use(leaderboardRouter);
router.use(dashboardRouter);

export default router;
