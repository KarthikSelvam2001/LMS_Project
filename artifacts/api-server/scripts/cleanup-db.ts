import { mongoose } from "@workspace/db";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lms_Project_Live";

async function run() {
  try {
    console.log("Connecting to " + MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    if (db) {
      console.log("Connected to database. Checking indexes on 'certificates' collection...");
      const collection = db.collection("certificates");
      const indexes = await collection.indexes();
      
      const indexNames = indexes.map(idx => idx.name);
      console.log("Current indexes:", indexNames);

      if (indexNames.includes("certificateNumber_1")) {
        console.log("Found obsolete index 'certificateNumber_1'. Dropping it...");
        await collection.dropIndex("certificateNumber_1");
        console.log("Index 'certificateNumber_1' dropped successfully.");
      } else {
        console.log("Index 'certificateNumber_1' not found. Nothing to drop.");
      }
    }
  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

run();
