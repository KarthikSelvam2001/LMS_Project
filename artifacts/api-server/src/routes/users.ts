import { Router, type IRouter } from "express";
import { User, Enrollment, Course } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: any, extras: Record<string, any> = {}) {
  return {
    id: user.id || user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    roleId: user.roleId,
    picture: user.picture || "",
    isActive: user.isActive,
    isDeleted: user.isDeleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy,
    ...extras,
  };
}

router.patch("/profile", async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { firstName, lastName, picture } = req.body;
    
    const updateData: any = { updatedAt: new Date() };
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (picture !== undefined) updateData.picture = picture;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.get("/users", async (req, res): Promise<void> => {
  try {
    const { role, search, active, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { isDeleted: false };
    if (role && ["ADMIN", "TRAINER", "LEARNER"].includes(role)) {
      query.roleId = role;
    }
    if (active !== undefined) {
      query.isActive = active === "true";
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: 1 }).limit(limitNum).skip(skip),
      User.countDocuments(query),
    ]);

    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [enrollmentCount, courseCount] = await Promise.all([
          Enrollment.countDocuments({ userId: user._id }),
          Course.countDocuments({ trainerId: user._id }),
        ]);
        return formatUser(user, {
          enrollmentCount,
          courseCount,
        });
      })
    );

    res.json({ users: usersWithCounts, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res): Promise<void> => {
  try {
    const { firstName, lastName, email, roleId = "LEARNER", password, createdBy = "ADMIN" } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: "firstName, lastName, email and password are required" });
      return;
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      roleId,
      password,
      isActive: true,
      createdBy,
      updatedBy: createdBy,
    });

    res.status(201).json(formatUser(user, { enrollmentCount: 0, courseCount: 0 }));
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.get("/users/:id", async (req, res): Promise<void> => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const [enrollmentCount, courseCount] = await Promise.all([
      Enrollment.countDocuments({ userId: user._id }),
      Course.countDocuments({ trainerId: user._id }),
    ]);

    res.json(formatUser(user, {
      enrollmentCount,
      courseCount,
    }));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.put("/users/:id", async (req, res): Promise<void> => {
  try {
    const { firstName, lastName, email, isActive, roleId, updatedBy = "ADMIN" } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, isActive, roleId, updatedBy, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.patch("/users/:id/role", async (req, res): Promise<void> => {
  try {
    const { roleId } = req.body;
    if (!["ADMIN", "TRAINER", "LEARNER"].includes(roleId)) {
      res.status(400).json({ message: "Invalid role. Must be ADMIN, TRAINER, or LEARNER" });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { roleId, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ message: "Failed to change role" });
  }
});

router.patch("/users/:id/status", async (req, res): Promise<void> => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive), updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isDeleted: true, isActive: false, updatedAt: new Date() });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
