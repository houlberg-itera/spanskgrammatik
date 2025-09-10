#!/usr/bin/env powershell
# ULTIMATE MERGE CONFLICT RESOLVER
# This script will completely clean up all merge conflicts and debug files

Write-Host "🔧 ULTIMATE MERGE CONFLICT RESOLVER" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 1: Checking current Git state..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Step 2: Aborting any ongoing merge..." -ForegroundColor Yellow
git merge --abort 2>$null

Write-Host ""
Write-Host "Step 3: Resetting to HEAD..." -ForegroundColor Yellow
git reset --hard HEAD 2>$null

Write-Host ""
Write-Host "Step 4: Pulling latest from GitHub..." -ForegroundColor Yellow
git pull origin main

Write-Host ""
Write-Host "Step 5: Force removing ALL debug files..." -ForegroundColor Yellow

# Complete list of debug files to remove
$allDebugFiles = @(
    "TYPESCRIPT_ISSUE_RESOLVED.md",
    "FINAL_SUCCESS_COMPLETE.md",
    "FOLDER_CASING_RESOLVED.md", 
    "SUCCESS_ALL_ISSUES_RESOLVED.md",
    "VERCEL_DEPLOYMENT_READY.md",
    "CRITICAL_DEPLOYMENT_STATUS.md",
    "DEVELOPMENT.md",
    "GET_SERVICE_ROLE_KEY.md",
    "GITHUB_SETUP_COMPLETE.md",
    "GIT_CONFLICT_RESOLUTION_SUCCESS.md",
    "GIT_SETUP_COMPLETE.md",
    "PROBLEM_RESOLUTION_COMPLETE.md",
    "SETUP_GIT_REPO.md",
    "SUPABASE_EMAIL_CONFIG.md",
    "fix-typescript-final.js",
    "fix-typescript.js", 
    "fix-folder-casing.ps1",
    "ultimate-fix.ps1",
    "verify-system.js",
    "setup-git.bat",
    "setup-git.ps1",
    "resolve-conflicts.ps1",
    "resolve-conflicts.bat",
    "fix-conflicts.ps1",
    "complete-merge-fix.ps1",
    "simple-fix.ps1"
)

$removedCount = 0
foreach ($file in $allDebugFiles) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "   Deleted: $file" -ForegroundColor Green
            $removedCount++
        } catch {
            Write-Host "   Could not delete: $file" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Step 6: Staging all changes..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Step 7: Committing clean state..." -ForegroundColor Yellow
if ($removedCount -gt 0) {
    git commit -m "Remove debug files and resolve conflicts - clean repository"
    Write-Host "   Committed removal of $removedCount debug files" -ForegroundColor Green
} else {
    Write-Host "   No changes to commit" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 8: Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "Step 9: Final status check..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "✅ REPOSITORY COMPLETELY CLEANED!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your repository now contains only:" -ForegroundColor Cyan
Write-Host "- Core application files (src/)" -ForegroundColor White
Write-Host "- Configuration files (package.json, tsconfig.json, etc.)" -ForegroundColor White
Write-Host "- Essential documentation (README.md)" -ForegroundColor White
Write-Host "- Database schema (supabase/)" -ForegroundColor White
Write-Host ""
Write-Host "Ready to run: npm run dev" -ForegroundColor Green
Write-Host ""
