import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    roleId: user.roleId,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()));

    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    if (user.isDeleted) return res.status(401).json({ message: "Account not found" });
    if (!user.isActive) return res.status(401).json({ message: "Account is deactivated" });
    if (user.password !== password) return res.status(401).json({ message: "Invalid email or password" });

    const userData = formatUser(user);
    res.cookie("lms_user", JSON.stringify(userData), {
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
    });

    res.json({ user: userData, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("lms_user", { path: "/" });
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", async (req, res) => {
  try {
    const cookieVal = req.cookies?.lms_user;
    if (!cookieVal) return res.status(401).json({ message: "Not authenticated" });

    let cookieData: any;
    try { cookieData = JSON.parse(cookieVal); } catch {
      return res.status(401).json({ message: "Invalid session" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, cookieData.id));
    if (!user || !user.isActive || user.isDeleted) {
      res.clearCookie("lms_user", { path: "/" });
      return res.status(401).json({ message: "Session expired" });
    }

    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get user" });
  }
});

export default router;
