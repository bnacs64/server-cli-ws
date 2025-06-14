#!/bin/bash

# Install dependencies for the controller management system

echo "📦 Installing Controller Management System Dependencies"
echo "====================================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    echo "npm should come with Node.js installation"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🎯 You can now run:"
    echo "   node simple-test.js           # Simple test without CLI dependencies"
    echo "   node diagnose-controller.js   # Diagnostic test"
    echo "   node app.js cli discover       # CLI discovery"
    echo "   node app.js server             # Start web server"
    echo ""
else
    echo "❌ Failed to install dependencies"
    echo ""
    echo "💡 Try running manually:"
    echo "   npm install commander inquirer express ws cors helmet morgan"
    echo ""
fi
