#!/usr/bin/env pwsh

Write-Host "Restarting server in production build mode..." -ForegroundColor Yellow

# Stop any running Next.js processes
Write-Host "Stopping any running Next.js processes..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clean up previous build
Write-Host "Cleaning up previous build..." -ForegroundColor Blue
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Build for production
Write-Host "Building application for production..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green

# Start production server
Write-Host "Starting production server..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin dashboard: http://localhost:3000/admin/dashboard" -ForegroundColor Cyan
Write-Host "AI Exercise Generator: http://localhost:3000/admin/exercise-generator" -ForegroundColor Cyan

npm run start
