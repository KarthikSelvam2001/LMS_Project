import { Router, type Response } from "express";
import { Enrollment, Course, User, Certificate } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";
import fs from "fs";

const router = Router();

function enrichEnrollment(enrollment: any) {
  if (!enrollment) return null;
  const obj = enrollment.toObject ? enrollment.toObject() : enrollment;
  return {
    ...obj,
    id: obj._id,
    userName: obj.userId ? `${obj.userId.firstName} ${obj.userId.lastName}` : "Unknown Student",
    userEmail: obj.userId ? obj.userId.email : null,
    courseTitle: obj.courseId ? obj.courseId.title : "Unknown Course",
  };
}

// Alias for learner's active enrollments
router.get("/enrollments/my-courses", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.roleId !== "LEARNER") return res.status(401).json({ message: "Unauthorized" });

    const [enrollments, certificates] = await Promise.all([
      Enrollment.find({ 
        userId: user.id, 
        status: { $in: ["ACTIVE", "COMPLETED"] },
        isDeleted: { $ne: true } 
      })
        .populate("userId", "firstName lastName email")
        .populate({
          path: "courseId",
          populate: [
            { path: "trainerId", select: "firstName lastName" },
            { path: "categoryId", select: "name" }
          ]
        })
        .sort({ enrolledAt: -1 }),
      Certificate.find({ learnerId: user.id })
    ]);

    let finalCertificates = certificates;
    const existingCourseIds = finalCertificates.map(c => c.courseId.toString());
    let generatedNew = false;

    for (const enr of enrollments) {
      if (enr.status === "COMPLETED" && enr.progress === 100) {
        const cId = enr.courseId?._id?.toString() || enr.courseId?.toString();
        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Enrollment completed found: ${cId}\n`);
        if (cId && !existingCourseIds.includes(cId)) {
          const { checkAndGenerateCertificate } = await import("./progress");
          fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Triggering checkAndGenerateCertificate for ${cId}\n`);
          await checkAndGenerateCertificate(user.id, cId, true);
          generatedNew = true;
        }
      }
    }

    if (generatedNew) {
      finalCertificates = await Certificate.find({ learnerId: user.id });
    }

    const certMap = new Map();
    finalCertificates.forEach(c => certMap.set(c.courseId.toString(), c._id.toString()));

    const enriched = enrollments.map(e => {
        const base = enrichEnrollment(e);
        return {
            ...base,
            certificateId: certMap.get(e.courseId?._id?.toString() || e.courseId?.toString())
        };
    });

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch my courses" });
  }
});

router.get("/enrollments", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { userId, courseId, status } = req.query as Record<string, string>;
    const query: any = { isDeleted: { $ne: true } };

    // Role-based filtering
    if (user.roleId === "TRAINER") {
      const myCourseIds = await Course.find({ trainerId: user.id, isDeleted: { $ne: true } }).distinct('_id');
      query.courseId = { $in: myCourseIds };
      if (courseId && myCourseIds.map(String).includes(courseId)) {
        query.courseId = courseId;
      }
    } else if (user.roleId === "LEARNER") {
      query.userId = user.id;
    } else {
      // ADMIN
      if (userId) query.userId = userId;
      if (courseId) query.courseId = courseId;
    }

    if (status && ["ACTIVE", "COMPLETED", "DROPPED"].includes(status)) {
      query.status = status;
    }

    const enrollments = await Enrollment.find(query)
      .populate("userId", "firstName lastName email")
      .populate("courseId", "title")
      .sort({ enrolledAt: -1 });

    if (user.roleId === "LEARNER") {
      let finalCertificates = await Certificate.find({ learnerId: user.id });
      const existingCourseIds = finalCertificates.map(c => c.courseId.toString());
      let generatedNew = false;
      
      for (const enr of enrollments) {
        if (enr.status === "COMPLETED" && enr.progress === 100) {
          const cId = enr.courseId?._id?.toString() || enr.courseId?.toString();
          if (cId && !existingCourseIds.includes(cId)) {
            const { checkAndGenerateCertificate } = await import("./progress");
            await checkAndGenerateCertificate(user.id, cId, true);
            generatedNew = true;
          }
        }
      }

      if (generatedNew) {
        finalCertificates = await Certificate.find({ learnerId: user.id });
      }

      const certMap = new Map();
      finalCertificates.forEach(c => certMap.set(c.courseId.toString(), c._id.toString()));
      
      const enriched = enrollments.map(e => {
        const base = enrichEnrollment(e);
        return {
          ...base,
          certificateId: certMap.get(e.courseId?._id?.toString() || e.courseId?.toString())
        };
      });
      return res.json(enriched);
    }

    return res.json(enrollments.map(enrichEnrollment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

router.post("/enrollments", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { courseId, userId } = req.body;
    if (!courseId) return res.status(400).json({ message: "Course ID required" });

    // Force learnerId from auth context
    const finalUserId = user.roleId === "LEARNER" ? user.id : (userId || user.id);

    const existing = await Enrollment.findOne({ userId: finalUserId, courseId, isDeleted: { $ne: true } });
    if (existing) return res.status(400).json({ message: "User already enrolled in this course" });

    const enrollment = await Enrollment.create({
      userId: finalUserId,
      courseId,
      status: "ACTIVE",
      progress: 0,
      enrolledAt: new Date(),
    });

    const populated = await Enrollment.findById(enrollment._id)
      .populate("userId", "firstName lastName email")
      .populate("courseId", "title");

    return res.status(201).json(enrichEnrollment(populated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create enrollment" });
  }
});

router.get("/enrollments/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const enrollment = await Enrollment.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate("userId", "firstName lastName email")
      .populate("courseId", "title");

    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    // Permission check
    if (user.roleId === "LEARNER" && String(enrollment.userId?._id) !== user.id) {
      return res.status(403).json({ message: "You do not have access to this enrollment" });
    }
    if (user.roleId === "TRAINER") {
      const course = await Course.findById(enrollment.courseId?._id);
      if (!course || String(course.trainerId) !== user.id) {
        return res.status(403).json({ message: "You do not have access to this enrollment" });
      }
    }

    return res.json(enrichEnrollment(enrollment));
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch enrollment" });
  }
});

router.patch("/enrollments/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { status, progress } = req.body;

    const existingEnrollment = await Enrollment.findById(req.params.id);
    if (!existingEnrollment) return res.status(404).json({ message: "Enrollment not found" });

    if (user.roleId === "LEARNER") {
        if (String(existingEnrollment.userId) !== user.id) {
            return res.status(403).json({ message: "You can only update your own enrollment" });
        }
        if (status !== "DROPPED") {
            return res.status(403).json({ message: "Learners can only drop courses" });
        }
    }
    const updateData: any = {};
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("userId", "firstName lastName email").populate("courseId", "title");

    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    // Generate certificate if completed
    if (enrollment.status === "COMPLETED" && enrollment.progress === 100) {
      const { checkAndGenerateCertificate } = await import("./progress");
      await checkAndGenerateCertificate(String(enrollment.userId._id), String(enrollment.courseId._id), true);
    }

    return res.json(enrichEnrollment(enrollment));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update enrollment" });
  }
});

router.patch("/enrollments/:id/drop", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    // Learners can only drop their own
    if (user.roleId === "LEARNER" && String(enrollment.userId) !== user.id) {
        return res.status(403).json({ message: "You can only drop your own enrollment" });
    }

    enrollment.status = "DROPPED";
    await enrollment.save();

    return res.json({ message: "Course dropped successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to drop course" });
  }
});

router.delete("/enrollments/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.roleId !== "ADMIN") return res.status(403).json({ message: "Only admins can delete enrollments" });

    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
    return res.json({ message: "Enrollment deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete enrollment" });
  }
});

export default router;
