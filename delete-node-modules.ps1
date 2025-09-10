# Delete Node Modules and Lock Files Script
# This removes problematic node_modules and lock files that cause npm permission errors

Write-Host "Starting cleanup of problematic npm packages..." -ForegroundColor Yellow

# Stop any running Node.js processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force

# Delete node_modules folder with force
Write-Host "Deleting node_modules folder..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "node_modules deleted successfully" -ForegroundColor Green
} else {
    Write-Host "node_modules folder not found" -ForegroundColor Yellow
}

# Delete package-lock.json if it exists
Write-Host "Deleting package-lock.json..." -ForegroundColor Blue
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "package-lock.json deleted successfully" -ForegroundColor Green
} else {
    Write-Host "package-lock.json not found" -ForegroundColor Yellow
}

# Delete yarn.lock if it exists
Write-Host "Deleting yarn.lock..." -ForegroundColor Blue
if (Test-Path "yarn.lock") {
    Remove-Item -Path "yarn.lock" -Force -ErrorAction SilentlyContinue
    Write-Host "yarn.lock deleted successfully" -ForegroundColor Green
} else {
    Write-Host "yarn.lock not found" -ForegroundColor Yellow
}

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Blue
npm cache clean --force

Write-Host "Cleanup complete! You can now run 'npm install' or 'yarn install'" -ForegroundColor Green
Write-Host "If you still have permission issues, restart your computer and try again." -ForegroundColor Cyan