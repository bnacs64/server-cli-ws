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
echo "1) Quick Test (Direct Communication) - Recommended"
echo "2) Full Test Suite (Bash script)"
echo "3) Diagnostic Test (Troubleshoot connection issues)"
echo "4) Manual Interactive Test"
echo "5) CLI Discovery Only"
echo "6) Start API Server for Manual Testing"
echo "7) Exit"
echo ""

read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running direct communication test..."
        echo "This will test all controller functions safely."
        echo ""
        node test-direct-communication.js
        ;;
    2)
        echo ""
        echo "🚀 Running full test suite..."
        echo "This includes CLI tests and API server tests."
        echo ""
        chmod +x test-controller.sh
        ./test-controller.sh
        ;;
    3)
        echo ""
        echo "🔍 Running diagnostic test..."
        echo "This will help identify connection issues."
        echo ""
        node diagnose-controller.js
        ;;
    4)
        echo ""
        echo "🎛️  Starting manual interactive test..."
        echo "This allows you to test different approaches manually."
        echo ""
        node manual-controller-test.js
        ;;
    5)
        echo ""
        echo "🔍 Running discovery only..."
        echo ""
        node app.js cli discover
        ;;
    6)
        echo ""
        echo "🌐 Starting API server..."
        echo "Server will be available at http://localhost:3000"
        echo "API docs: http://localhost:3000/docs"
        echo "Press Ctrl+C to stop"
        echo ""
        node app.js server
        ;;
    7)
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
echo "   - controller_test_*.log (detailed logs)"
echo ""
echo "💡 To enable network configuration test (CAUTION - controller will restart):"
echo "   ENABLE_NETWORK_TEST=1 node test-direct-communication.js"
