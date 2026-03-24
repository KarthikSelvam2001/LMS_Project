import { Router, type Response } from "express";
import { Certificate, Enrollment, Course, User, mongoose } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";
import { checkAndGenerateCertificate } from "./progress";
import path from "path";
import fs from "fs";

const router = Router();

// GET /api/certificates/my-certificates
router.get("/my-certificates", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Auto-generate missing certificates before fetching
    if (user.roleId === "LEARNER") {
      const completedEnrollments = await Enrollment.find({ userId: user.id, status: "COMPLETED", progress: 100, isDeleted: { $ne: true } });
      const existingCerts = await Certificate.find({ learnerId: user.id }).distinct('courseId');
      
      fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] My Certs Hit: user=${user.id}, completed=${completedEnrollments.length}, existingCerts=${existingCerts.length}\n`);

      const existingCourseIds = existingCerts.map(c => c.toString());
      
      for (const enr of completedEnrollments) {
        const cId = enr.courseId?.toString();
        fs.appendFileSync('./lms_debug.log', `[${new Date().toISOString()}] Checking completion for cId=${cId}\n`);
        if (cId && !existingCourseIds.includes(cId)) {
          console.log(`Auto-generating missing certificate for user ${user.id} course ${cId}`);
          await checkAndGenerateCertificate(user.id, cId, true);
        }
      }
    }

    const certs = await Certificate.find({ learnerId: user.id })
      .populate("courseId")
      .sort({ issuedAt: -1 });

    res.json(certs.map((c: any) => ({
      id: c.certificateId,
      courseId: c.courseId?._id,
      courseName: c.courseId?.title || "Unknown Course",
      issuedAt: c.issuedAt,
      pdfUrl: `/api/certificates/${c.certificateId}/view`,
      certificateUrl: c.certificateUrl
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
});

// POST /api/certificates/generate
router.post("/generate", async (req: AuthRequest, res: Response) => {
  try {
    const { userId, courseId } = req.body;
    const effectiveUserId = userId || req.user?.id;
    
    if (!effectiveUserId || !courseId) {
      res.status(400).json({ message: "userId and courseId required" });
      return;
    }

    await checkAndGenerateCertificate(effectiveUserId, courseId, true);
    
    const cert = await Certificate.findOne({ learnerId: effectiveUserId, courseId });
    if (!cert) {
      res.status(400).json({ message: "Certificate could not be generated. Ensure course is 100% complete and all quizzes are passed." });
      return;
    }

    res.status(201).json(cert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate certificate" });
  }
});

// GET /api/certificates/backfill (Temporary script)
router.get("/backfill", async (req: AuthRequest, res: Response) => {
  try {
    const completed = await Enrollment.find({ status: "COMPLETED", progress: 100, isDeleted: { $ne: true } });
    let count = 0;
    for (const enr of completed) {
      await checkAndGenerateCertificate(enr.userId.toString(), enr.courseId.toString(), true);
      count++;
    }
    res.json({ message: `Backfilled ${count} certificates` });
  } catch (err) {
    res.status(500).json({ message: "Backfill failed" });
  }
});

// GET /api/certificates/:id/view
router.get("/:id/view", async (req: AuthRequest, res: Response) => {
  try {
    const cert = await Certificate.findOne({ 
      $or: [
        { certificateId: req.params.id },
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : new mongoose.Types.ObjectId() }
      ]
    });
    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    const filename = path.basename(cert.certificateUrl);
    const certDir = path.join(process.cwd(), "public", "certificates");
    const filePath = path.join(certDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Certificate file not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to view certificate" });
  }
});

// GET /api/certificates/:id/download
router.get("/:id/download", async (req: AuthRequest, res: Response) => {
  try {
    const cert = await Certificate.findOne({ 
      $or: [
        { certificateId: req.params.id },
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : new mongoose.Types.ObjectId() }
      ]
    });
    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    const filename = path.basename(cert.certificateUrl);
    const certDir = path.join(process.cwd(), "public", "certificates");
    const filePath = path.join(certDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Certificate file not found" });
    }

    return res.download(filePath, filename);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to download certificate" });
  }
});

export default router;
