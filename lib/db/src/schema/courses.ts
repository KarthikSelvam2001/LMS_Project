import { pgTable, serial, text, integer, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const courseStatusEnum = pgEnum("course_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const courseLevelEnum = pgEnum("course_level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  status: courseStatusEnum("status").notNull().default("DRAFT"),
  level: courseLevelEnum("level").notNull().default("BEGINNER"),
  price: numeric("price", { precision: 10, scale: 2 }),
  isPublished: boolean("is_published").notNull().default(false),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  trainerId: integer("trainer_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
