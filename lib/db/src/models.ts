import mongoose, { Schema, Document } from "mongoose";

// --- Users ---
const UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, default: "" },
  provider: { type: String, default: "local" },
  picture: { type: String, default: "" },
  roleId: { type: String, enum: ["ADMIN", "TRAINER", "LEARNER"], default: "LEARNER" },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: String, default: "SYSTEM" },
  updatedBy: { type: String, default: "SYSTEM" },
}, { timestamps: true });

UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export const User = mongoose.model("User", UserSchema);

// --- Categories ---
const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

CategorySchema.virtual('id').get(function() {
  return this._id.toHexString();
});
CategorySchema.set('toJSON', { virtuals: true });

export const Category = mongoose.model("Category", CategorySchema);

// --- Courses ---
const CourseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },
  status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
  level: { type: String, enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"], default: "BEGINNER" },
  price: { type: Number },
  isPublished: { type: Boolean, default: false },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  trainerId: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

CourseSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
CourseSchema.set('toJSON', { virtuals: true });

export const Course = mongoose.model("Course", CourseSchema);

// --- Modules ---
const ModuleSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: { type: String },
  orderIndex: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

ModuleSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
ModuleSchema.set('toJSON', { virtuals: true });

export const Module = mongoose.model("Module", ModuleSchema);

// --- Lessons ---
const LessonSchema = new Schema({
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String },
  duration: { type: Number },
  orderIndex: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

LessonSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
LessonSchema.set('toJSON', { virtuals: true });

export const Lesson = mongoose.model("Lesson", LessonSchema);

// --- Quizzes ---
const QuizSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  title: { type: String, default: "Lesson Quiz" },
  questions: { type: [Schema.Types.Mixed], default: [] },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

QuizSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
QuizSchema.set('toJSON', { virtuals: true });

export const Quiz = mongoose.model("Quiz", QuizSchema);

// --- Enrollments ---
const EnrollmentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ["ACTIVE", "COMPLETED", "DROPPED"], default: "ACTIVE" },
  progress: { type: Number, default: 0 },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

EnrollmentSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
EnrollmentSchema.set('toJSON', { virtuals: true });

export const Enrollment = mongoose.model("Enrollment", EnrollmentSchema);

// --- Quiz Attempts ---
const QuizAttemptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: { type: [Schema.Types.Mixed], default: [] },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  passingScore: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  isPassed: { type: Boolean, required: true },
  attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

QuizAttemptSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
QuizAttemptSchema.set('toJSON', { virtuals: true });

export const QuizAttempt = mongoose.model("QuizAttempt", QuizAttemptSchema);

// --- Attendance ---
const AttendanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["PRESENT", "ABSENT", "LATE"], default: "PRESENT" },
  remarks: { type: String },
}, { timestamps: true });

AttendanceSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
AttendanceSchema.set('toJSON', { virtuals: true });

export const Attendance = mongoose.model("Attendance", AttendanceSchema);

// --- Certificates ---
const CertificateSchema = new Schema({
  learnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateId: { type: String, required: true, unique: true },
  issuedAt: { type: Date, default: Date.now },
  completionDate: { type: Date, required: true },
  score: { type: Number, default: 0 },
  certificateUrl: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

CertificateSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
CertificateSchema.set('toJSON', { virtuals: true });

export const Certificate = mongoose.model("Certificate", CertificateSchema);

// --- Leaderboard ---
const LeaderboardSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, default: 0 },
  rank: { type: Number },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

LeaderboardSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
LeaderboardSchema.set('toJSON', { virtuals: true });

export const Leaderboard = mongoose.model("Leaderboard", LeaderboardSchema);

// --- Lesson Progress ---
const LessonProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  isWatched: { type: Boolean, default: false },
  isQuizPassed: { type: Boolean, default: false },
  status: { type: String, enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"], default: "NOT_STARTED" },
}, { timestamps: true });

LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const LessonProgress = mongoose.model("LessonProgress", LessonProgressSchema);
