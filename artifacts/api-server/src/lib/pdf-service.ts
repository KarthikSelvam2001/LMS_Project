import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export interface CertificateData {
  learnerName: string;
  courseName: string;
  trainerName: string;
  completionDate: string;
  certificateId: string;
}

export async function generateCertificatePDF(data: CertificateData, outputPath: string) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margin: 0, // ❗ important
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const width = doc.page.width;
      const height = doc.page.height;

      const assetsDir = path.join(process.cwd(), "public", "assets");
      const logoPath = path.join(assetsDir, "logo.jpg");
      const signaturePath = path.join(assetsDir, "signature.png");

      // 🔹 BORDER
      doc.rect(20, 20, width - 40, height - 40).lineWidth(2).stroke("#1a365d");

      // 🔹 WATERMARK
      if (fs.existsSync(logoPath)) {
        doc.save();
        doc.opacity(0.08);
        doc.image(logoPath, width / 2 - 150, height / 2 - 150, { width: 300 });
        doc.restore();
      }

      let currentY = 60;

      // 🔹 LOGO
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, width / 2 - 40, currentY, { width: 80 });
        currentY += 100; // manual spacing
      }

      // 🔹 TITLE
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor("#1a365d")
        .text("CERTIFICATE OF COMPLETION", 0, currentY, {
          align: "center",
        });

      currentY += 50;

      // 🔹 SUB TEXT
      doc
        .font("Helvetica")
        .fontSize(16)
        .fillColor("#4a5568")
        .text("This certifies that", 0, currentY, {
          align: "center",
        });

      currentY += 40;

      // 🔹 NAME
      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .fillColor("#2d3748")
        .text(data.learnerName, 0, currentY, {
          align: "center",
        });

      currentY += 50;

      // 🔹 MESSAGE
      doc
        .font("Helvetica")
        .fontSize(16)
        .text("has successfully completed the course", 0, currentY, {
          align: "center",
        });

      currentY += 40;

      // 🔹 COURSE NAME
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#1a365d")
        .text(data.courseName, 0, currentY, {
          align: "center",
        });

      currentY += 60;

      // 🔹 DETAILS
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#2d3748");

      doc.text(`Instructor: ${data.trainerName}`, 0, currentY, {
        align: "center",
      });

      currentY += 25;

      doc.text(`Date: ${data.completionDate}`, 0, currentY, {
        align: "center",
      });

      currentY += 25;

      doc.text(`Certificate ID: ${data.certificateId}`, 0, currentY, {
        align: "center",
      });

      // 🔹 SIGNATURE
      if (fs.existsSync(signaturePath)) {
        const sigWidth = 120;
        const sigHeight = 50; // approx or control it

        const sigX = width / 2 - sigWidth / 2;
        const sigY = height - 120;

        // 🔹 Draw signature
        doc.image(signaturePath, sigX, sigY, { width: sigWidth });

        // 🔹 Text JUST BELOW image
        doc
          .font("Helvetica-Oblique")
          .fontSize(12)
          .fillColor("#4a5568")
          .text("Authorized Signature", 0, sigY + sigHeight + 5, {
            align: "center",
          });
      }

      doc.end();

      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}