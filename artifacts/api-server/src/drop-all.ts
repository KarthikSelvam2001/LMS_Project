import { connectDB, mongoose } from "@workspace/db";

async function main() {
  try {
    await connectDB();
    await mongoose.connection.dropDatabase();
    console.log("MongoDB database dropped successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to drop database:", err);
    process.exit(1);
  }
}

main();
