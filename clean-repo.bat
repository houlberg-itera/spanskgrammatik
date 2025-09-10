@echo off
echo Cleaning repository...

echo Aborting merge...
git merge --abort 2>nul

echo Resetting to HEAD...
git reset --hard HEAD 2>nul

echo Pulling from GitHub...
git pull origin main

echo Removing debug files...
del "TYPESCRIPT_ISSUE_RESOLVED.md" 2>nul
del "FINAL_SUCCESS_COMPLETE.md" 2>nul
del "SUCCESS_ALL_ISSUES_RESOLVED.md" 2>nul
del "VERCEL_DEPLOYMENT_READY.md" 2>nul
del "fix-typescript-final.js" 2>nul
del "ultimate-fix.ps1" 2>nul

echo Staging changes...
git add .

echo Committing...
git commit -m "Remove debug files"

echo Pushing...
git push origin main

echo Done! Run: npm run dev
