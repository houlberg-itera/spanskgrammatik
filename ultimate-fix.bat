@echo off
echo 🔧 ULTIMATE MERGE CONFLICT RESOLVER
echo ====================================

echo.
echo Step 1: Checking Git status...
git status

echo.
echo Step 2: Aborting any merge...
git merge --abort 2>nul

echo.
echo Step 3: Resetting to HEAD...
git reset --hard HEAD 2>nul

echo.
echo Step 4: Pulling from GitHub...
git pull origin main

echo.
echo Step 5: Removing debug files...
del /f /q "TYPESCRIPT_ISSUE_RESOLVED.md" 2>nul
del /f /q "FINAL_SUCCESS_COMPLETE.md" 2>nul
del /f /q "FOLDER_CASING_RESOLVED.md" 2>nul
del /f /q "SUCCESS_ALL_ISSUES_RESOLVED.md" 2>nul
del /f /q "VERCEL_DEPLOYMENT_READY.md" 2>nul
del /f /q "CRITICAL_DEPLOYMENT_STATUS.md" 2>nul
del /f /q "DEVELOPMENT.md" 2>nul
del /f /q "GET_SERVICE_ROLE_KEY.md" 2>nul
del /f /q "fix-typescript-final.js" 2>nul
del /f /q "fix-typescript.js" 2>nul
del /f /q "ultimate-fix.ps1" 2>nul
del /f /q "verify-system.js" 2>nul
del /f /q "*.ps1" 2>nul

echo.
echo Step 6: Staging and committing...
git add .
git commit -m "Remove debug files - clean repository"

echo.
echo Step 7: Pushing to GitHub...
git push origin main

echo.
echo ✅ REPOSITORY CLEANED!
echo Ready to run: npm run dev
echo.
pause
