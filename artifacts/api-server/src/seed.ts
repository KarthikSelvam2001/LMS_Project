import { User, Category, Course, Module, Lesson, Quiz, Enrollment, Certificate } from "@workspace/db";

export async function seedIfEmpty() {
  // Clearing existing data to ensure a fresh comprehensive seed as requested
  console.log("Clearing existing data for a fresh comprehensive seed...");
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Course.deleteMany({}),
    Module.deleteMany({}),
    Lesson.deleteMany({}),
    Quiz.deleteMany({}),
    Enrollment.deleteMany({}),
    Certificate.deleteMany({})
  ]);

  console.log("Seeding database with production-like comprehensive data...");

  // 1. Users
  const admins = await User.insertMany([
    { firstName: "Alice", lastName: "Johnson", email: "admin1@lms.com", password: "Admin@123", roleId: "ADMIN" },
    { firstName: "Michael", lastName: "Smith", email: "admin2@lms.com", password: "Admin@123", roleId: "ADMIN" }
  ]);

  const trainers = await User.insertMany([
    { firstName: "David", lastName: "Miller", email: "david@lms.com", password: "Trainer@123", roleId: "TRAINER" },
    { firstName: "Emma", lastName: "Wilson", email: "emma@lms.com", password: "Trainer@123", roleId: "TRAINER" },
    { firstName: "James", lastName: "Brown", email: "james@lms.com", password: "Trainer@123", roleId: "TRAINER" },
    { firstName: "Sophia", lastName: "Davis", email: "sophia@lms.com", password: "Trainer@123", roleId: "TRAINER" },
    { firstName: "Daniel", lastName: "Anderson", email: "daniel@lms.com", password: "Trainer@123", roleId: "TRAINER" }
  ]);

  const learners = await User.insertMany([
    { firstName: "Olivia", lastName: "Taylor", email: "olivia@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Liam", lastName: "Thomas", email: "liam@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Noah", lastName: "White", email: "noah@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Ava", lastName: "Harris", email: "ava@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Mason", lastName: "Martin", email: "mason@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Isabella", lastName: "Thompson", email: "isabella@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Lucas", lastName: "Garcia", email: "lucas@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Mia", lastName: "Martinez", email: "mia@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Ethan", lastName: "Robinson", email: "ethan@lms.com", password: "Learner@123", roleId: "LEARNER" },
    { firstName: "Charlotte", lastName: "Clark", email: "charlotte@lms.com", password: "Learner@123", roleId: "LEARNER" }
  ]);

  // 2. Categories
  const categories = await Category.insertMany([
    { name: "Data Science", description: "Machine learning, analytics, and data engineering" },
    { name: "Design", description: "UI/UX, graphic design, and product design" },
    { name: "DevOps", description: "Cloud infrastructure and CI/CD" },
    { name: "Mobile", description: "iOS and Android app development" },
    { name: "Security", description: "Cybersecurity and ethical hacking" },
    { name: "Web Development", description: "Frontend and backend web technologies" }
  ]);

  // 3. Courses
  const courseTitlesByCat: Record<string, string[]> = {
    "Data Science": ["Python for Data Science", "Machine Learning Mastery", "Natural Language Processing", "Big Data Engineering"],
    "Design": ["UI/UX Fundamentals", "Figma Prototyping Masterclass", "Graphic Design Theory", "Motion Design Pro"],
    "DevOps": ["Docker & Kubernetes Essentials", "AWS Cloud Architect", "CI/CD Pipeline Design", "Terraform Mastery"],
    "Mobile": ["React Native Masterclass", "iOS Development Swift", "Android Dev with Kotlin", "Flutter Deep Dive"],
    "Security": ["Ethical Hacking 101", "Network Security Fundamentals", "Cyber Defense Strategies", "Cloud Security Expert"],
    "Web Development": ["React & TypeScript Guide", "Node.js API Development", "Fullstack MERN Guide", "Next.js 14 Essentials"]
  };

  const courseImages = [
    "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80"
  ];

  const coursesCreated = [];
  for (const cat of categories) {
    const titles = courseTitlesByCat[cat.name] || [];
    for (let i = 0; i < titles.length; i++) {
        const course = await Course.create({
            title: titles[i],
            description: `A comprehensive masterclass on ${titles[i]} with production-grade practices.`,
            level: ["BEGINNER", "INTERMEDIATE", "ADVANCED"][i % 3],
            status: "PUBLISHED",
            thumbnail: courseImages[i % courseImages.length],
            price: 49.99 + (i * 10),
            categoryId: cat._id,
            trainerId: trainers[i % trainers.length]._id,
            isActive: true,
            isPublished: true
        });
        coursesCreated.push(course);
    }
  }

  // 4. Modules, Lessons, Quizzes
  const moduleTitles = ["Getting Started", "Foundational Concepts", "Advanced Techniques", "Building Projects", "Best Practices"];
  const videoUrlsByCat: Record<string, string> = {
    "Data Science": "https://www.youtube.com/watch?v=ua-CiDNNj30",
    "Design": "https://www.youtube.com/watch?v=68w2VwalD5w",
    "DevOps": "https://www.youtube.com/watch?v=hP77Rua1E0c",
    "Mobile": "https://www.youtube.com/watch?v=0-S5a0eXPoc",
    "Security": "https://www.youtube.com/watch?v=3Kq1M-8U6_I",
    "Web Development": "https://www.youtube.com/watch?v=w7ejDZ8SWv8"
  };

  for (const course of coursesCreated) {
    const numModules = Math.floor(Math.random() * 3) + 3; // 3-5 modules
    const catObject = categories.find(c => c._id.toString() === course.categoryId?.toString());
    const videoUrl = videoUrlsByCat[catObject?.name || ""] || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    for (let m = 0; m < numModules; m++) {
        const module = await Module.create({
            courseId: course._id,
            title: moduleTitles[m],
            description: `Mastering the ${moduleTitles[m].toLowerCase()} phase.`,
            orderIndex: m + 1
        });

        const numLessons = Math.floor(Math.random() * 4) + 3; // 3-6 lessons
        for (let l = 0; l < numLessons; l++) {
            const lesson = await Lesson.create({
                moduleId: module._id,
                title: `${module.title} - Session ${l + 1}`,
                description: `In-depth exploration of ${module.title.toLowerCase()} concepts and practical implementation.`,
                videoUrl: videoUrl,
                duration: 900 + (l * 120),
                orderIndex: l + 1
            });

            // Create Quiz for each lesson with 5 questions
            const questions = [];
            for (let q = 1; q <= 5; q++) {
                questions.push({
                    question: `Which of the following best defines the core concept discussed in ${lesson.title}?`,
                    options: [
                        "Primary architectural pattern",
                        "Secondary utility function",
                        "Legacy support mechanism",
                        "None of the above"
                    ],
                    answer: "Primary architectural pattern",
                    explanation: "This concept is central to the lesson material as explained in the video walkthrough."
                });
            }

            await Quiz.create({
                lessonId: lesson._id,
                title: `${lesson.title} Assessment`,
                questions: questions
            });
        }
    }
  }

  // 4.5 Quick Test Course for Certificate Generation
  const testCourse = await Course.create({
    title: "Quick Certificate Test",
    description: "A very short course with 1 lesson and 1 quiz to quickly test the certificate generation system.",
    level: "BEGINNER",
    status: "PUBLISHED",
    thumbnail: courseImages[0],
    price: 0,
    categoryId: categories[0]._id,
    trainerId: trainers[0]._id,
    isActive: true,
    isPublished: true
  });

  const testModule = await Module.create({
    courseId: testCourse._id,
    title: "The Only Module",
    description: "Complete this module to get your certificate.",
    orderIndex: 1
  });

  const testLesson = await Lesson.create({
    moduleId: testModule._id,
    title: "The Only Lesson",
    description: "Watch this short video and take the 1-question quiz.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    duration: 60,
    orderIndex: 1
  });

  await Quiz.create({
    lessonId: testLesson._id,
    title: "The Final Exam",
    questions: [{
      question: "Are you ready to see your brand new certificate?",
      options: ["Yes", "No", "Not sure", "Never"],
      answer: "Yes",
      explanation: "Yes is the only correct answer!"
    }]
  });

  const olivia = learners.find(l => l.email === "olivia@lms.com");
  if (olivia) {
    await Enrollment.create({
      userId: olivia._id,
      courseId: testCourse._id,
      status: "COMPLETED",
      progress: 100,
      enrolledAt: new Date(Date.now() - 86400000),
      completedAt: new Date()
    });
  }

  // 5. Enrollments
  for (const learner of learners) {
    const numEnrollments = Math.floor(Math.random() * 3) + 2; // 2-4 enrollments
    const shuffledCourses = [...coursesCreated].sort(() => 0.5 - Math.random());
    const coursesToEnroll = shuffledCourses.slice(0, numEnrollments);

    for (const ec of coursesToEnroll) {
        await Enrollment.create({
            userId: learner._id,
            courseId: ec._id,
            status: "ACTIVE",
            progress: Math.floor(Math.random() * 80),
            enrolledAt: new Date()
        });
    }
  }

  console.log("Categories seeded");
  console.log("Users seeded");
  console.log("Courses seeded");
  console.log("Modules seeded");
  console.log("Lessons seeded");
  console.log("Quizzes seeded");
  console.log("Enrollments seeded");
  console.log("Database seeding completed successfully.");
}
