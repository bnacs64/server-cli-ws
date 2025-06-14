@echo off
echo Controller Management System - Server Mode
echo ==========================================
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

REM Start server mode
echo Starting server mode...
echo Server will be available at: http://localhost:3000
echo API documentation: http://localhost:3000/docs
echo Health check: http://localhost:3000/health
echo.
echo Press Ctrl+C to stop the server
echo.
node app.js server

pause
