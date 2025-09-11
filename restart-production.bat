@echo off
echo Restarting server in production build mode...

echo Stopping any running Next.js processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo Cleaning up previous build...
if exist ".next" rmdir /s /q ".next" >nul 2>&1

echo Building application for production...
call npm run build

if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Build completed successfully!

echo Starting production server...
echo Server will be available at: http://localhost:3000
echo Admin dashboard: http://localhost:3000/admin/dashboard
echo AI Exercise Generator: http://localhost:3000/admin/exercise-generator

call npm run start
