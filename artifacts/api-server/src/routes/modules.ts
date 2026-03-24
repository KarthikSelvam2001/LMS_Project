import { Router, type Response } from "express";
import { Module, Lesson, mongoose } from "@workspace/db";
import { AuthRequest, authorize } from "../middlewares/auth";

const router = Router();

function fmt(m: any) {
  return { ...m.toObject(), id: m._id };
}

router.get("/modules", async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.query as Record<string, string>;
    if (!courseId || courseId === "NaN" || courseId === "undefined") {
      return res.status(400).json({ message: "Invalid or missing courseId" });
    }

    console.log("[modules] GET /modules courseId:", courseId);

    const filter: any = { courseId: new mongoose.Types.ObjectId(courseId), isDeleted: { $ne: true } };
    const modules = await Module.find(filter).sort({ orderIndex: 1 });

    console.log("[modules] found:", modules.length);

    const withCounts = await Promise.all(
      modules.map(async (m) => {
        const lessonCount = await Lesson.countDocuments({ moduleId: m._id, isDeleted: { $ne: true } });
        return { ...fmt(m), lessonCount };
      })
    );

    return res.json(withCounts);
  } catch (err) {
    console.error("[modules] error:", err);
    return res.status(500).json({ message: "Failed to fetch modules" });
  }
});

router.post("/modules", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, title, description, orderIndex = 0 } = req.body;
    if (!courseId || !title) return res.status(400).json({ message: "courseId and title required" });

    const m = await Module.create({
      courseId,
      title,
      description,
      orderIndex,
    });

    return res.status(201).json({ ...fmt(m), lessonCount: 0 });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create module" });
  }
});

router.get("/modules/:id", async (req: AuthRequest, res: Response) => {
  try {
    const m = await Module.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!m) return res.status(404).json({ message: "Module not found" });

    const lessons = await Lesson.find({ moduleId: m._id, isDeleted: { $ne: true } }).sort({ orderIndex: 1 });

    return res.json({
      ...fmt(m),
      lessons,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch module" });
  }
});

router.put("/modules/:id", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, orderIndex } = req.body;

    const m = await Module.findByIdAndUpdate(
      req.params.id,
      { title, description, orderIndex },
      { new: true }
    );

    if (!m) return res.status(404).json({ message: "Module not found" });
    return res.json(fmt(m));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update module" });
  }
});

router.delete("/modules/:id", authorize(["ADMIN", "TRAINER"]), async (req: AuthRequest, res: Response) => {
  try {
    const m = await Module.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!m) return res.status(404).json({ message: "Module not found" });
    return res.json({ message: "Module deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete module" });
  }
});

export default router;
