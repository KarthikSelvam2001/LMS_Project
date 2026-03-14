import { db, usersTable, categoriesTable, coursesTable, modulesTable, lessonsTable, enrollmentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedIfEmpty() {
  const result = await db.execute(sql`SELECT COUNT(*)::int as count FROM users`);
  const count = (result.rows[0] as any)?.count ?? 0;
  if (count > 0) {
    console.log(`Database already has ${count} users — skipping seed.`);
    return;
  }

  console.log("Seeding database with demo data...");

  const categories = await db.insert(categoriesTable).values([
    { name: "Web Development", description: "Frontend and backend web technologies", color: "#3B82F6" },
    { name: "Data Science", description: "Machine learning, analytics, and data engineering", color: "#8B5CF6" },
    { name: "Design", description: "UI/UX, graphic design, and product design", color: "#EC4899" },
    { name: "DevOps", description: "Cloud infrastructure and CI/CD", color: "#F59E0B" },
    { name: "Mobile", description: "iOS and Android app development", color: "#10B981" },
    { name: "Security", description: "Cybersecurity and ethical hacking", color: "#EF4444" },
  ]).returning();

  const users = await db.insert(usersTable).values([
    { firstName: "Alice", lastName: "Johnson", email: "alice@lms.com", password: "Admin@123", roleId: "ADMIN", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Bob", lastName: "Williams", email: "bob@lms.com", password: "Trainer@123", roleId: "TRAINER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Carol", lastName: "Davis", email: "carol@lms.com", password: "Trainer@123", roleId: "TRAINER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "David", lastName: "Miller", email: "david@lms.com", password: "Trainer@123", roleId: "TRAINER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Eva", lastName: "Brown", email: "eva@lms.com", password: "Learner@123", roleId: "LEARNER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Frank", lastName: "Wilson", email: "frank@lms.com", password: "Learner@123", roleId: "LEARNER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Grace", lastName: "Lee", email: "grace@lms.com", password: "Learner@123", roleId: "LEARNER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Henry", lastName: "Taylor", email: "henry@lms.com", password: "Learner@123", roleId: "LEARNER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Kate", lastName: "Thompson", email: "kate@lms.com", password: "Trainer@123", roleId: "TRAINER", isActive: true, createdBy: "SYSTEM" },
    { firstName: "Leo", lastName: "Garcia", email: "leo@lms.com", password: "Learner@123", roleId: "LEARNER", isActive: true, createdBy: "SYSTEM" },
  ]).returning();

  const [admin, bob, carol, david, eva, frank, grace, henry, kate, leo] = users;

  const courses = await db.insert(coursesTable).values([
    { title: "React & TypeScript Masterclass", description: "Build production-grade React apps with TypeScript, hooks, and modern patterns.", status: "PUBLISHED", level: "INTERMEDIATE", price: "79.99", isPublished: true, categoryId: categories[0].id, trainerId: bob.id },
    { title: "Node.js Backend Engineering", description: "REST APIs, auth, databases, and deployment with Node.js and Express.", status: "PUBLISHED", level: "INTERMEDIATE", price: "69.99", isPublished: true, categoryId: categories[0].id, trainerId: bob.id },
    { title: "Python for Data Science", description: "Pandas, NumPy, Matplotlib, and machine learning fundamentals.", status: "PUBLISHED", level: "BEGINNER", price: "59.99", isPublished: true, categoryId: categories[1].id, trainerId: carol.id },
    { title: "Machine Learning A-Z", description: "Supervised and unsupervised learning, neural networks, and model deployment.", status: "PUBLISHED", level: "ADVANCED", price: "99.99", isPublished: true, categoryId: categories[1].id, trainerId: carol.id },
    { title: "UI/UX Design Fundamentals", description: "User research, wireframing, prototyping, and design systems in Figma.", status: "PUBLISHED", level: "BEGINNER", price: "49.99", isPublished: true, categoryId: categories[2].id, trainerId: david.id },
    { title: "Docker & Kubernetes Essentials", description: "Containerization, orchestration, and cloud-native deployment strategies.", status: "PUBLISHED", level: "INTERMEDIATE", price: "74.99", isPublished: true, categoryId: categories[3].id, trainerId: kate.id },
    { title: "React Native Mobile Dev", description: "Cross-platform iOS & Android apps with Expo and React Native.", status: "DRAFT", level: "INTERMEDIATE", price: "79.99", isPublished: false, categoryId: categories[4].id, trainerId: bob.id },
  ]).returning();

  const modules = await db.insert(modulesTable).values([
    { courseId: courses[0].id, title: "Getting Started", description: "Setup and introduction", orderIndex: 1 },
    { courseId: courses[0].id, title: "Core Concepts", description: "Hooks and TypeScript", orderIndex: 2 },
    { courseId: courses[1].id, title: "Express Basics", description: "Routing and middleware", orderIndex: 1 },
    { courseId: courses[1].id, title: "Authentication & DB", description: "JWT and Postgres", orderIndex: 2 },
    { courseId: courses[2].id, title: "Python Basics", description: "Environment and fundamentals", orderIndex: 1 },
    { courseId: courses[2].id, title: "Data Analysis", description: "Pandas and visualization", orderIndex: 2 },
  ]).returning();

  await db.insert(lessonsTable).values([
    { moduleId: modules[0].id, title: "Project Setup", description: "Install Node, Vite and create your first React app.", videoUrl: "https://www.youtube.com/watch?v=dGcsHMXbSOA", duration: 900, orderIndex: 1 },
    { moduleId: modules[0].id, title: "First Component", description: "Creating your first React component.", videoUrl: "https://www.youtube.com/watch?v=dGcsHMXbSOA", duration: 1200, orderIndex: 2 },
    { moduleId: modules[1].id, title: "TypeScript Basics", description: "Types, interfaces, generics, and JSX.", videoUrl: "https://www.youtube.com/watch?v=BCg4U1FzODs", duration: 1800, orderIndex: 1 },
    { moduleId: modules[1].id, title: "Hooks Deep Dive", description: "useState, useEffect, useCallback and custom hooks.", videoUrl: "https://www.youtube.com/watch?v=O6P86uwfdR0", duration: 2700, orderIndex: 2 },
    { moduleId: modules[2].id, title: "Express Fundamentals", description: "Routing, middleware, and request lifecycle.", videoUrl: "https://www.youtube.com/watch?v=L72fhGm1tfE", duration: 1200, orderIndex: 1 },
    { moduleId: modules[2].id, title: "Middleware Patterns", description: "Custom middleware and error handling.", videoUrl: "https://www.youtube.com/watch?v=L72fhGm1tfE", duration: 900, orderIndex: 2 },
    { moduleId: modules[3].id, title: "JWT Authentication", description: "Sign, verify, and refresh tokens securely.", videoUrl: "https://www.youtube.com/watch?v=mbsmsi7l3r4", duration: 2100, orderIndex: 1 },
    { moduleId: modules[4].id, title: "Python Setup", description: "pyenv, venv, pip, and Jupyter notebooks.", videoUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw", duration: 720, orderIndex: 1 },
    { moduleId: modules[4].id, title: "Python Basics", description: "Variables, data types, control flow.", videoUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw", duration: 1500, orderIndex: 2 },
    { moduleId: modules[5].id, title: "Pandas DataFrames", description: "DataFrames, series, filtering, and aggregations.", videoUrl: "https://www.youtube.com/watch?v=vmEHCJofslg", duration: 2400, orderIndex: 1 },
  ]);

  await db.insert(enrollmentsTable).values([
    { userId: eva.id, courseId: courses[0].id, status: "ACTIVE", progress: 65 },
    { userId: eva.id, courseId: courses[4].id, status: "COMPLETED", progress: 100 },
    { userId: frank.id, courseId: courses[2].id, status: "ACTIVE", progress: 40 },
    { userId: frank.id, courseId: courses[3].id, status: "ACTIVE", progress: 15 },
    { userId: grace.id, courseId: courses[4].id, status: "ACTIVE", progress: 80 },
    { userId: henry.id, courseId: courses[5].id, status: "ACTIVE", progress: 55 },
    { userId: henry.id, courseId: courses[1].id, status: "COMPLETED", progress: 100 },
    { userId: leo.id, courseId: courses[0].id, status: "ACTIVE", progress: 30 },
    { userId: leo.id, courseId: courses[1].id, status: "ACTIVE", progress: 70 },
    { userId: eva.id, courseId: courses[1].id, status: "ACTIVE", progress: 25 },
  ]);

  console.log("Seed complete: users, courses, modules, lessons, enrollments.");
}
