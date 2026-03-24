@echo off
set PORT=5173
set BASE_PATH=/
set NODE_ENV=development
cd "artifacts\lms-frontend"
npx vite --config vite.config.ts --host 0.0.0.0
