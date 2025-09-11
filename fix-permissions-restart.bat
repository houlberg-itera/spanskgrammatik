@echo off
echo Fixing Next.js permissions and restarting server...

echo Stopping any running Node.js processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 3 >nul

echo Removing .next directory with admin permissions...
rmdir /s /q ".next" >nul 2>&1

echo Clearing NPM cache...
npm cache clean --force >nul 2>&1

echo Building for production with clean slate...
npm run build

if %errorlevel% neq 0 (
    echo Production build failed. Starting development server instead...
    npm run dev
) else (
    echo Production build successful! Starting production server...
    npm run start
)

pause
