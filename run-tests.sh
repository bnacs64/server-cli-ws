#!/bin/bash

# Simple test launcher for Controller Management System
# Tests the real controller at 192.168.2.66

echo "🧪 Controller Management System - Test Launcher"
echo "=============================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "✅ Dependencies are ready"
echo ""

# Show menu
echo "Choose a test to run:"
echo "1) Controller Test (Safe get-then-set approach) - Recommended"
echo "2) CLI Discovery Only"
echo "3) Start API Server for Manual Testing"
echo "4) Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running controller test..."
        echo "This will safely test all controller functions using get-then-set approach."
        echo ""
        node scripts/test-controller.js
        ;;
    2)
        echo ""
        echo "🔍 Running discovery only..."
        echo ""
        node app.js cli discover
        ;;
    3)
        echo ""
        echo "🌐 Starting API server..."
        echo "Server will be available at http://localhost:3000"
        echo "API docs: http://localhost:3000/docs"
        echo "Press Ctrl+C to stop"
        echo ""
        node app.js server
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Test completed!"
echo ""
echo "📋 Check the following files for detailed results:"
echo "   - test_results_*.json (JSON format)"
echo ""
echo "💡 The test safely gets current values then sets the same values for testing."
echo "   Original settings are automatically restored after testing."
