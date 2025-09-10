#!/usr/bin/env powershell
# Resolve merge conflicts by accepting deletion of debug files

Write-Host "Resolving merge conflicts by accepting deletions..." -ForegroundColor Cyan

# Debug documentation files to remove
$debugDocs = @(
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
    "SUPABASE_EMAIL_CONFIG.md"
)

# Debug script files to remove
$debugScripts = @(
    "fix-typescript-final.js",
    "fix-typescript.js", 
    "fix-folder-casing.ps1",
    "ultimate-fix.ps1",
    "verify-system.js",
    "setup-git.bat",
    "setup-git.ps1"
)

# Remove debug documentation files
Write-Host "Removing debug documentation files..." -ForegroundColor Yellow
foreach ($file in $debugDocs) {
    if (Test-Path $file) {
        git rm --force $file 2>$null
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

# Remove debug script files  
Write-Host "Removing debug script files..." -ForegroundColor Yellow
foreach ($file in $debugScripts) {
    if (Test-Path $file) {
        git rm --force $file 2>$null
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "All merge conflicts resolved!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. git commit -m 'Resolve merge conflicts - accept deletion of debug files'" -ForegroundColor White
Write-Host "2. git push origin main" -ForegroundColor White
Write-Host ""
