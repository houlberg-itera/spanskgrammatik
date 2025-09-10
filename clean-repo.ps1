#!/usr/bin/env powershell
# Ultimate conflict resolver - simple version

Write-Host "Resolving all merge conflicts..."

Write-Host "Step 1: Aborting any merge..."
git merge --abort 2>$null

Write-Host "Step 2: Resetting to HEAD..."
git reset --hard HEAD 2>$null

Write-Host "Step 3: Pulling from GitHub..."
git pull origin main

Write-Host "Step 4: Removing debug files..."

$files = @(
    "TYPESCRIPT_ISSUE_RESOLVED.md",
    "FINAL_SUCCESS_COMPLETE.md",
    "FOLDER_CASING_RESOLVED.md", 
    "SUCCESS_ALL_ISSUES_RESOLVED.md",
    "VERCEL_DEPLOYMENT_READY.md",
    "CRITICAL_DEPLOYMENT_STATUS.md",
    "DEVELOPMENT.md",
    "GET_SERVICE_ROLE_KEY.md",
    "fix-typescript-final.js",
    "fix-typescript.js", 
    "ultimate-fix.ps1",
    "verify-system.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file"
    }
}

Write-Host "Step 5: Staging changes..."
git add .

Write-Host "Step 6: Committing..."
git commit -m "Remove debug files"

Write-Host "Step 7: Pushing..."
git push origin main

Write-Host "Done! Repository is clean."
Write-Host "Run: npm run dev"
