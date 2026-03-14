import { Router, type IRouter } from "express";
import { db, usersTable, enrollmentsTable, coursesTable } from "@workspace/db";
import { eq, ilike, sql, or, and } from "drizzle-orm";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect, extras: Record<string, any> = {}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    roleId: user.roleId,
    isActive: user.isActive,
    isDeleted: user.isDeleted,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    createdBy: user.createdBy,
    ...extras,
  };
}

router.get("/users", async (req, res) => {
  try {
    const { role, search, active, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(usersTable.isDeleted, false)];
    if (role && ["ADMIN", "TRAINER", "LEARNER"].includes(role)) {
      conditions.push(eq(usersTable.roleId, role as any));
    }
    if (active !== undefined) {
      conditions.push(eq(usersTable.isActive, active === "true"));
    }
    if (search) {
      conditions.push(or(
        ilike(usersTable.firstName, `%${search}%`),
        ilike(usersTable.lastName, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
      ));
    }

    const whereClause = and(...conditions);

    const [users, totalResult] = await Promise.all([
      db.select().from(usersTable).where(whereClause).limit(limitNum).offset(offset).orderBy(usersTable.createdAt),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [enrollCount, courseCount] = await Promise.all([
          db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.userId, user.id)),
          db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.trainerId, user.id)),
        ]);
        return formatUser(user, {
          enrollmentCount: enrollCount[0]?.count ?? 0,
          courseCount: courseCount[0]?.count ?? 0,
        });
      })
    );

    res.json({ users: usersWithCounts, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { firstName, lastName, email, roleId = "LEARNER", password, createdBy = "ADMIN" } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "firstName, lastName, email and password are required" });
    }

    const [user] = await db.insert(usersTable).values({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      roleId: roleId as any,
      password,
      isActive: true,
      createdBy,
      updatedBy: createdBy,
    }).returning();

    res.status(201).json(formatUser(user, { enrollmentCount: 0, courseCount: 0 }));
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ message: "Email already exists" });
    console.error(err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user || user.isDeleted) return res.status(404).json({ message: "User not found" });

    const [enrollCount, courseCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.userId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.trainerId, id)),
    ]);

    res.json(formatUser(user, {
      enrollmentCount: enrollCount[0]?.count ?? 0,
      courseCount: courseCount[0]?.count ?? 0,
    }));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, email, isActive, roleId, updatedBy = "ADMIN" } = req.body;

    const [user] = await db.update(usersTable)
      .set({ firstName, lastName, email, isActive, roleId: roleId as any, updatedBy, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(formatUser(user));
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ message: "Email already exists" });
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { roleId } = req.body;
    if (!["ADMIN", "TRAINER", "LEARNER"].includes(roleId)) {
      return res.status(400).json({ message: "Invalid role. Must be ADMIN, TRAINER, or LEARNER" });
    }

    const [user] = await db.update(usersTable)
      .set({ roleId: roleId as any, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ message: "Failed to change role" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;

    const [user] = await db.update(usersTable)
      .set({ isActive: Boolean(isActive), updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(usersTable)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(eq(usersTable.id, id));
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
