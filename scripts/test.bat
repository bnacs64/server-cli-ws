@echo off
echo Controller Management System - Quick Test
echo ========================================
echo.

REM Change to project root directory
cd /d "%~dp0\.."

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Running controller test...
echo This will safely test all controller functions.
echo.
node scripts\test-controller.js

echo.
echo Test completed. Press any key to exit.
pause
