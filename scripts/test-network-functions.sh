#!/bin/bash

# Comprehensive Network Functions Test Suite - Bash Wrapper
# Provides a bash interface for running network function tests
# against the controller hardware with proper error handling and logging.

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_SCRIPT="$SCRIPT_DIR/test-network-comprehensive.js"
LOGS_DIR="$PROJECT_ROOT/logs"

# Default parameters
TEST_TYPE="all"
TIMEOUT=10000
LOG_LEVEL="info"
SAVE_RESULTS=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Comprehensive Network Functions Test Suite"
    echo ""
    echo "OPTIONS:"
    echo "  -t, --type TYPE        Test type: all, discovery, time, server, network, protocol (default: all)"
    echo "  -T, --timeout MS       Discovery timeout in milliseconds (default: 10000)"
    echo "  -l, --log-level LEVEL  Log level: info, verbose, quiet (default: info)"
    echo "  -s, --save-results     Save results to file (default: true)"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Run all tests with default settings"
    echo "  $0 -t discovery -T 15000             # Run only discovery test with 15s timeout"
    echo "  $0 -l verbose                        # Run all tests with verbose logging"
    echo "  $0 -t time --save-results false      # Run time tests without saving results"
    echo ""
}

# Function to write colored output
log_message() {
    local message="$1"
    local color="${2:-$WHITE}"
    
    if [[ "$LOG_LEVEL" != "quiet" ]]; then
        echo -e "${color}${message}${NC}"
    fi
}

# Function to check Node.js availability
check_nodejs() {
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        log_message "✅ Node.js found: $node_version" "$GREEN"
        return 0
    else
        log_message "❌ Node.js not found. Please install Node.js from https://nodejs.org/" "$RED"
        return 1
    fi
}

# Function to check if test script exists
check_test_script() {
    if [[ -f "$TEST_SCRIPT" ]]; then
        log_message "✅ Test script found: $TEST_SCRIPT" "$GREEN"
        return 0
    else
        log_message "❌ Test script not found: $TEST_SCRIPT" "$RED"
        return 1
    fi
}

# Function to ensure logs directory exists
ensure_logs_dir() {
    if [[ ! -d "$LOGS_DIR" ]]; then
        mkdir -p "$LOGS_DIR"
        log_message "📁 Created logs directory: $LOGS_DIR" "$BLUE"
    fi
}

# Function to run the network tests
run_network_tests() {
    log_message "\n🚀 Starting Network Functions Test Suite" "$CYAN"
    log_message "=========================================" "$CYAN"
    log_message "Test Type: $TEST_TYPE" "$WHITE"
    log_message "Timeout: $TIMEOUT ms" "$WHITE"
    log_message "Log Level: $LOG_LEVEL" "$WHITE"
    log_message "Save Results: $SAVE_RESULTS" "$WHITE"
    log_message ""
    
    # Set environment variables for test configuration
    export TEST_TYPE="$TEST_TYPE"
    export TEST_TIMEOUT="$TIMEOUT"
    export LOG_LEVEL="$LOG_LEVEL"
    export SAVE_RESULTS="$SAVE_RESULTS"
    
    # Run the Node.js test script
    log_message "Executing: node $TEST_SCRIPT" "$YELLOW"
    log_message ""
    
    if node "$TEST_SCRIPT"; then
        log_message "\n✅ Test execution completed successfully" "$GREEN"
        return 0
    else
        local exit_code=$?
        log_message "\n❌ Test execution failed with exit code: $exit_code" "$RED"
        return $exit_code
    fi
}

# Function to display test results summary
show_test_summary() {
    log_message "\n📊 Test Results Summary" "$CYAN"
    log_message "======================" "$CYAN"
    
    # Find the most recent test results file
    local latest_results
    if latest_results=$(find "$LOGS_DIR" -name "network_test_results_*.json" -type f -exec ls -t {} + 2>/dev/null | head -n1); then
        if [[ -n "$latest_results" ]]; then
            local filename=$(basename "$latest_results")
            log_message "Latest results file: $filename" "$WHITE"
            
            # Parse JSON results using basic tools (avoiding jq dependency)
            if command -v python3 >/dev/null 2>&1; then
                python3 -c "
import json
import sys
try:
    with open('$latest_results', 'r') as f:
        data = json.load(f)
    
    summary = data.get('summary', {})
    controller = data.get('controller', {})
    
    print(f\"\\nTest Summary:\")
    print(f\"  Total Tests: {summary.get('totalTests', 'N/A')}\")
    print(f\"  Passed: {summary.get('passedTests', 'N/A')}\")
    print(f\"  Failed: {summary.get('failedTests', 'N/A')}\")
    print(f\"  Success Rate: {summary.get('successRate', 'N/A')}%\")
    print(f\"  Duration: {round(summary.get('totalDuration', 0) / 1000, 2)} seconds\")
    
    if controller:
        print(f\"\\nController Information:\")
        print(f\"  Serial: {controller.get('serialNumber', 'N/A')}\")
        print(f\"  IP: {controller.get('ip', 'N/A')}\")
        print(f\"  MAC: {controller.get('macAddress', 'N/A')}\")
        print(f\"  Driver: {controller.get('driverVersion', 'N/A')}\")
        
except Exception as e:
    print(f\"Failed to parse results file: {e}\", file=sys.stderr)
    sys.exit(1)
" 2>/dev/null || log_message "Failed to parse results file" "$RED"
            else
                log_message "Python3 not available for JSON parsing" "$YELLOW"
            fi
        fi
    else
        log_message "No test results files found in $LOGS_DIR" "$YELLOW"
    fi
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                TEST_TYPE="$2"
                if [[ ! "$TEST_TYPE" =~ ^(all|discovery|time|server|network|protocol)$ ]]; then
                    log_message "❌ Invalid test type: $TEST_TYPE" "$RED"
                    usage
                    exit 1
                fi
                shift 2
                ;;
            -T|--timeout)
                TIMEOUT="$2"
                if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]]; then
                    log_message "❌ Invalid timeout: $TIMEOUT" "$RED"
                    usage
                    exit 1
                fi
                shift 2
                ;;
            -l|--log-level)
                LOG_LEVEL="$2"
                if [[ ! "$LOG_LEVEL" =~ ^(info|verbose|quiet)$ ]]; then
                    log_message "❌ Invalid log level: $LOG_LEVEL" "$RED"
                    usage
                    exit 1
                fi
                shift 2
                ;;
            -s|--save-results)
                SAVE_RESULTS="$2"
                if [[ ! "$SAVE_RESULTS" =~ ^(true|false)$ ]]; then
                    log_message "❌ Invalid save-results value: $SAVE_RESULTS" "$RED"
                    usage
                    exit 1
                fi
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_message "❌ Unknown option: $1" "$RED"
                usage
                exit 1
                ;;
        esac
    done
}

# Main execution function
main() {
    log_message "🧪 Network Functions Test Suite - Bash Wrapper" "$CYAN"
    log_message "===============================================" "$CYAN"
    log_message ""
    
    # Parse command line arguments
    parse_args "$@"
    
    # Check prerequisites
    if ! check_nodejs; then
        exit 1
    fi
    
    if ! check_test_script; then
        exit 1
    fi
    
    # Ensure logs directory exists
    ensure_logs_dir
    
    # Run the tests
    if run_network_tests; then
        exit_code=0
    else
        exit_code=$?
    fi
    
    # Show summary if results should be saved
    if [[ "$SAVE_RESULTS" == "true" ]]; then
        show_test_summary
    fi
    
    # Final status
    log_message ""
    if [[ $exit_code -eq 0 ]]; then
        log_message "🎉 Test suite completed successfully!" "$GREEN"
    else
        log_message "❌ Test suite completed with errors" "$RED"
    fi
    
    exit $exit_code
}

# Execute main function with all arguments
main "$@"
