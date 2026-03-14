import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    DROP TABLE IF EXISTS leaderboard, certificates, attendance, quiz_attempts, quizzes, lessons, modules, enrollments, courses, users, categories CASCADE;
    DROP TYPE IF EXISTS attendance_status, lesson_type, user_role, course_status, course_level, enrollment_status CASCADE;
  `);
  console.log("All tables and enums dropped successfully.");
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
