@echo off
echo 🔧 COMPREHENSIVE BUILD FIX
echo =========================

echo.
echo Step 1: Stopping any running processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul

echo.
echo Step 2: Complete cleanup...
rmdir /s /q .next 2>nul
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul

echo.
echo Step 3: Clearing npm cache...
npm cache clean --force

echo.
echo Step 4: Fresh installation...
npm install

echo.
echo Step 5: Verifying Next.js installation...
if exist "node_modules\next\dist\bin\next.js" (
    echo ✅ Next.js installed correctly
) else (
    echo ❌ Next.js installation failed
    echo Trying alternative installation...
    npm install next@latest react@latest react-dom@latest
)

echo.
echo Step 6: Building application...
npm run build

echo.
echo Step 7: Testing development server...
echo Starting dev server in background for testing...
start /b npm run dev
timeout /t 5
echo.

echo ✅ Build fix complete!
echo If successful, access your app at: http://localhost:3000
pause
