# LMS Portal - Workspace

## Overview

Full-stack Learning Management System (LMS) built on a pnpm monorepo with React + Express + PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + cookie-parser
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Cookie-based session (plain password for demo)

## Demo Credentials

| Role       | Email             | Password      |
|------------|-------------------|---------------|
| Admin      | alice@lms.com     | Admin@123     |
| Instructor | bob@lms.com       | Trainer@123   |
| Student    | eva@lms.com       | Learner@123   |

## LMS Features

- **Auth**: Login page with role-based credentials, logout, session via cookie
- **Dashboard**: Stats cards (users, courses, enrollments, lessons), recent enrollments, popular courses
- **User Management**: Table with role badges, Change Role dropdown per user, Create User dialog
- **Course Catalog**: Grid view, search + filter (status/level/category), Create Course button
- **Course Detail**: Full course info, lessons list, enrollment stats
- **Enrollments**: Table with progress tracking, status filter
- **Categories**: Cards grid, Create Category button

## Database Collections (PostgreSQL)

- `users` — id, name, email, password_hash, role (ADMIN/INSTRUCTOR/STUDENT), phone, bio, is_active
- `categories` — id, name, description, color
- `courses` — id, title, description, status, level, price, duration, category_id, instructor_id
- `lessons` — id, title, content, video_url, duration, order_index, course_id, type (VIDEO/READING/QUIZ)
- `enrollments` — id, user_id, course_id, status (ACTIVE/COMPLETED/DROPPED), progress, enrolled_at, completed_at

## API Routes

- `POST /api/auth/login` — Login with email + password
- `GET  /api/auth/me` — Get current user from cookie
- `POST /api/auth/logout` — Clear session
- `GET/POST /api/users` — List / Create users
- `PATCH /api/users/:id/role` — Change user role
- `GET/POST /api/courses` — List / Create courses (with search, filter)
- `GET/POST /api/lessons` — Lessons for a course
- `GET/POST /api/enrollments` — List / Create enrollments
- `GET/POST /api/categories` — Categories
- `GET /api/dashboard/stats` — Dashboard statistics
- `GET /api/dashboard/recent-enrollments` — Recent enrollment list
- `GET /api/dashboard/popular-courses` — Popular courses by enrollment

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   └── src/routes/     # auth, users, courses, lessons, enrollments, categories, dashboard
└── lms-frontend/       # React + Vite LMS UI
    └── src/
        ├── contexts/   # auth-context.tsx
        ├── pages/      # login, dashboard, users, courses, course-detail, enrollments, categories
        └── components/ # layout.tsx (sidebar + header with user dropdown)
lib/
├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/                 # Drizzle ORM schema + DB connection
    └── src/schema/     # users, categories, courses, lessons, enrollments
```
