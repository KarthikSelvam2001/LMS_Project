import { Router, type Response } from "express";
import { Course, User, Category, Module, Enrollment } from "@workspace/db";
import { AuthRequest, authorize } from "../middlewares/auth";

const router = Router();

async function enrichCourse(course: any) {
  const [enrollmentCount, moduleCount] = await Promise.all([
    Enrollment.countDocuments({ courseId: course._id, isDeleted: { $ne: true } }),
    Module.countDocuments({ courseId: course._id, isDeleted: { $ne: true } }),
  ]);

  return {
    ...course.toObject(),
    id: course._id,
    enrollmentCount,
    moduleCount,
    trainerName: course.trainerId ? `${course.trainerId.firstName} ${course.trainerId.lastName}` : null,
    categoryName: course.categoryId ? course.categoryId.name : null,
  };
}

router.get("/courses", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { search, categoryId, status, level, trainerId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { isDeleted: { $ne: true } };
    
    // Role-based filtering
    if (user.roleId === "TRAINER") {
      query.trainerId = user.id;
    } else if (user.roleId === "LEARNER") {
      query.status = "PUBLISHED";
      
      // Optional filter for enrolled courses only
      if (req.query.enrolledOnly === "true") {
        const enrolledCourseIds = await Enrollment.find({ userId: user.id, isDeleted: { $ne: true } }).distinct('courseId');
        query._id = { $in: enrolledCourseIds };
      }
    }

    if (search) query.title = { $regex: search, $options: "i" };
    if (categoryId) query.categoryId = categoryId;
    if (status && user.roleId !== "LEARNER") {
      if (["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) query.status = status;
    }
    if (level && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(level)) query.level = level;
    if (trainerId && user.roleId === "ADMIN") query.trainerId = trainerId;

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate("trainerId", "firstName lastName")
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skip),
      Course.countDocuments(query),
    ]);

    const enriched = await Promise.all(courses.map(enrichCourse));

    return res.json({ courses: enriched, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch courses" });
  }
});

router.post("/courses", authorize(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, thumbnail, status = "DRAFT", level = "BEGINNER", price, categoryId, trainerId } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const course = await Course.create({
      title,
      description,
      thumbnail,
      status,
      level,
      price: price ? parseFloat(price) : null,
      isPublished: status === "PUBLISHED",
      categoryId: categoryId || null,
      trainerId: trainerId || null,
    });

    const populated = await Course.findById(course._id)
      .populate("trainerId", "firstName lastName")
      .populate("categoryId", "name");

    return res.status(201).json(await enrichCourse(populated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create course" });
  }
});

router.get("/courses/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!/^[0-9a-fA-F]{24}$/.test(id as string)) {
      return res.status(400).json({ message: "Invalid course ID format" });
    }

    const course = await Course.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("trainerId", "firstName lastName")
      .populate("categoryId", "name");

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Permissions check
    if (user.roleId === "TRAINER" && String(course.trainerId?._id) !== user.id) {
      return res.status(403).json({ message: "You do not have access to this course" });
    }
    if (user.roleId === "LEARNER" && course.status !== "PUBLISHED") {
      // Check if enrolled even if not published? Usually learners only see published.
      const enrollment = await Enrollment.findOne({ userId: user.id, courseId: course._id });
      if (!enrollment) return res.status(403).json({ message: "This course is not yet published" });
    }

    const modules = await Module.find({ courseId: course._id, isDeleted: { $ne: true } }).sort({ orderIndex: 1 });

    const enriched = await enrichCourse(course);
    return res.json({ ...enriched, modules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch course" });
  }
});

router.put("/courses/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const targetCourse = await Course.findById(req.params.id);
    if (!targetCourse) return res.status(404).json({ message: "Course not found" });

    if (user.roleId === "TRAINER" && String(targetCourse.trainerId) !== user.id) {
      return res.status(403).json({ message: "You can only edit your own courses" });
    }
    if (user.roleId === "LEARNER") {
      return res.status(403).json({ message: "Learners cannot edit courses" });
    }

    const { title, description, thumbnail, status, level, price, categoryId, trainerId, isPublished } = req.body;

    const updateData: any = {
      title,
      description,
      thumbnail,
      status,
      level,
      price: price !== undefined ? (price ? parseFloat(price) : null) : undefined,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : (status === "PUBLISHED" ? true : undefined),
      categoryId: categoryId !== undefined ? (categoryId || null) : undefined,
    };

    // Only Admin can change the trainer
    if (user.roleId === "ADMIN" && trainerId !== undefined) {
      updateData.trainerId = trainerId || null;
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate("trainerId", "firstName lastName")
      .populate("categoryId", "name");

    return res.json(await enrichCourse(course));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update course" });
  }
});

router.delete("/courses/:id", authorize(["ADMIN"]), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!course) return res.status(404).json({ message: "Course not found" });
    return res.json({ message: "Course deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete course" });
  }
});

export default router;
