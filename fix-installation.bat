@echo off
echo ===============================================
echo Comprehensive Next.js Installation Fix
echo ===============================================

echo Step 1: Cleaning up old installations...
call delete-node-modules.bat

echo.
echo Step 2: Trying npm install with compatibility flags...
npm install --no-optional --legacy-peer-deps --verbose
if %ERRORLEVEL% == 0 (
    echo NPM install successful!
    goto :test_next
)

echo.
echo Step 3: Trying npm install with force...
npm install --force
if %ERRORLEVEL% == 0 (
    echo NPM install with force successful!
    goto :test_next
)

echo.
echo Step 4: Installing Next.js specifically...
npm install next@15.5.2 react@19.0.0 react-dom@19.0.0 --save
if %ERRORLEVEL% == 0 (
    echo Core packages installed, installing rest...
    npm install
    if %ERRORLEVEL% == 0 (
        echo All packages installed!
        goto :test_next
    )
)

echo.
echo Step 5: Installing with reduced concurrency...
npm install --maxsockets 1
if %ERRORLEVEL% == 0 (
    echo Installation with reduced concurrency successful!
    goto :test_next
)

:test_next
echo.
echo ===============================================
echo Testing Next.js installation...
echo ===============================================

if exist "node_modules\.bin\next.cmd" (
    echo ✅ Next.js binary found!
    echo Testing Next.js dev server...
    timeout /t 3 /nobreak > nul
    start "" cmd /k "npm run dev"
    echo Dev server should be starting...
) else (
    echo ❌ Next.js binary not found!
    echo Installation failed. Try running as administrator.
)

echo.
echo ===============================================
echo Installation process complete
echo ===============================================
pause