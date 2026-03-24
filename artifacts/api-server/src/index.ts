import app from "./app";
import { connectDB } from "@workspace/db";
import { seedIfEmpty } from "./seed";
import dotenv from "dotenv";
dotenv.config();

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
