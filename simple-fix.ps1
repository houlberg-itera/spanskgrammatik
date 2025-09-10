#!/usr/bin/env powershell
# Complete merge conflict resolution

Write-Host "Resolving merge conflicts..." -ForegroundColor Cyan

Write-Host "Step 1: Checking Git status..." -ForegroundColor Yellow
git status

Write-Host "Step 2: Adding all changes..." -ForegroundColor Yellow
git add .

Write-Host "Step 3: Force removing debug files..." -ForegroundColor Yellow

$debugFiles = @(
    "FINAL_SUCCESS_COMPLETE.md",
    "FOLDER_CASING_RESOLVED.md", 
    "SUCCESS_ALL_ISSUES_RESOLVED.md",
    "TYPESCRIPT_ISSUE_RESOLVED.md",
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
    "setup-git.ps1"
)

foreach ($file in $debugFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force 2>$null
        git rm $file 2>$null
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

Write-Host "Step 4: Staging all changes..." -ForegroundColor Yellow
git add .

Write-Host "Step 5: Final status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Ready to commit!" -ForegroundColor Green
Write-Host "Run these commands:" -ForegroundColor Cyan
Write-Host "git commit -m 'Remove debug files'" -ForegroundColor White
Write-Host "git push origin main" -ForegroundColor White
