#!/usr/bin/env powershell
# Fix folder casing issue for TypeScript
# This script renames the folder from Spanskgrammatik to spanskgrammatik

Write-Host "🔧 FIXING FOLDER CASING ISSUE" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

$currentPath = "C:\source\repos\Spanskgrammatik"
$correctPath = "C:\source\repos\spanskgrammatik"

Write-Host "Current folder: $currentPath" -ForegroundColor Yellow
Write-Host "Target folder: $correctPath" -ForegroundColor Green

# Check if we're in the right location
if (!(Test-Path $currentPath)) {
    Write-Host "❌ Current folder not found!" -ForegroundColor Red
    exit 1
}

# Check if target already exists
if (Test-Path $correctPath) {
    Write-Host "❌ Target folder already exists!" -ForegroundColor Red
    Write-Host "Please manually resolve this first." -ForegroundColor Red
    exit 1
}

Write-Host "1. Saving current state..." -ForegroundColor Yellow
Set-Location $currentPath

# Commit any uncommitted changes
Write-Host "   - Staging all changes..." -ForegroundColor Gray
git add .
git commit -m "Save state before folder rename" 2>$null

Write-Host "2. Moving to parent directory..." -ForegroundColor Yellow
Set-Location "C:\source\repos"

Write-Host "3. Renaming folder..." -ForegroundColor Yellow
try {
    Move-Item -Path $currentPath -Destination $correctPath -Force
    Write-Host "   ✅ Folder renamed successfully!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to rename folder: $_" -ForegroundColor Red
    exit 1
}

Write-Host "4. Updating VS Code workspace..." -ForegroundColor Yellow
Set-Location $correctPath

Write-Host ""
Write-Host "✅ FOLDER CASING FIXED!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "New folder path: $correctPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Close VS Code" -ForegroundColor White
Write-Host "2. Open the new folder: $correctPath" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host ""