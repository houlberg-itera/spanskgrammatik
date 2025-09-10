@echo off
echo Deleting problematic npm packages and lock files...

echo Stopping Node processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul

echo Deleting node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo node_modules deleted successfully
) else (
    echo node_modules folder not found
)

echo Deleting package-lock.json...
if exist package-lock.json (
    del /f package-lock.json
    echo package-lock.json deleted successfully
) else (
    echo package-lock.json not found
)

echo Deleting yarn.lock...
if exist yarn.lock (
    del /f yarn.lock
    echo yarn.lock deleted successfully
) else (
    echo yarn.lock not found
)

echo Clearing npm cache...
npm cache clean --force

echo.
echo Cleanup complete! You can now run 'npm install' or 'yarn install'
echo If you still have permission issues, restart your computer and try again.
pause