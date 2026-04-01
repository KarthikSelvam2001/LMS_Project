import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lms_Project_Live";

async function fixCertIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not established");

    const collection = db.collection("certificates");
    const indexes = await collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    const hasCertNumIndex = indexes.some(idx => idx.name === "certificateNumber_1");

    if (hasCertNumIndex) {
      console.log("Dropping index 'certificateNumber_1'...");
      await collection.dropIndex("certificateNumber_1");
      console.log("Index dropped successfully.");
    } else {
      console.log("Index 'certificateNumber_1' not found, no action needed.");
    }

    await mongoose.disconnect();
    console.log("Disconnected.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fixCertIndexes();
