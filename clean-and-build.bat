@echo off
echo Stopping all Node processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 >nul

echo Cleaning .next directory...
if exist .next (
    rmdir /s /q .next 2>nul
    timeout /t 2 >nul
)

echo Clearing npm cache...
npm cache clean --force

echo Starting production build...
npm run build

if %ERRORLEVEL% EQU 0 (
    echo Build successful! Starting production server...
    npm run start
) else (
    echo Build failed!
    pause
)