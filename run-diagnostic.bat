@echo off
echo Running Controller Diagnostic from correct directory...
echo Current directory: %CD%
echo.

REM Change to the server directory
cd /d "c:\Users\rdpadmin\Documents\server"

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Node.js found: 
node --version

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo.
echo Running diagnostic test for controller at 192.168.2.66...
echo.

node diagnose-controller.js

echo.
echo Diagnostic complete. Press any key to exit.
pause
