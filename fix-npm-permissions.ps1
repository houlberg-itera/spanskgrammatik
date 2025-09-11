#!/usr/bin/env powershell
# Fix npm permission errors - run as administrator

Write-Host "🔧 FIXING NPM PERMISSION ERRORS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 1: Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "Step 2: Removing node_modules with force..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Removed node_modules" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "   Removed package-lock.json" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 4: Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host ""
Write-Host "Step 5: Setting npm to use Windows-compatible options..." -ForegroundColor Yellow
npm config set script-shell powershell
npm config set cache-min 86400

Write-Host ""
Write-Host "Step 6: Installing with verbose output..." -ForegroundColor Yellow
npm install --verbose

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "Run: npm run dev" -ForegroundColor Cyan
