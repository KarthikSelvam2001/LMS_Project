import app from "./app";
import { connectDB } from "@workspace/db";
import { seedIfEmpty } from "./seed";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

let currentDir = "";
if (typeof __dirname !== "undefined") {
  currentDir = __dirname;
} else {
  // @ts-ignore
  currentDir = path.dirname(fileURLToPath(import.meta.url));
}

dotenv.config({ path: path.resolve(currentDir, "../.env") });

const rawPort = process.env["PORT"] || "3000";
const port = Number(rawPort);

async function startServer() {
  try {
    await connectDB();
    await seedIfEmpty();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
