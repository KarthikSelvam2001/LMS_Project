import express from "express";
import { Enrollment, User, Course, Certificate } from "@workspace/db";
import { checkAndGenerateCertificate } from "./progress";

const router = express.Router();

router.get("/debug/all", async (req, res) => {
  try {
    const allEnr = await Enrollment.find({ status: "COMPLETED" }).populate('userId courseId');
    res.json(allEnr.map(e => ({
        u: (e.userId as any)?._id,
        c: (e.courseId as any)?._id,
        email: (e.userId as any)?.email,
        courseName: (e.courseId as any)?.title
    })));
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
