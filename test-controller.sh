#!/bin/bash

# Test Script for Real Controller at 192.168.2.66
# Tests all implemented functions on the connected controller

CONTROLLER_IP="192.168.2.66"
CONTROLLER_PORT="60000"
TEST_LOG="controller_test_$(date +%Y%m%d_%H%M%S).log"

# Set to 1 to enable network configuration test (CAUTION: Controller will restart)
ENABLE_NETWORK_TEST=${ENABLE_NETWORK_TEST:-0}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$1" | tee -a "$TEST_LOG"
}

# Test header
print_header() {
    log "${BLUE}================================================${NC}"
    log "${BLUE}$1${NC}"
    log "${BLUE}================================================${NC}"
}

# Test section
print_section() {
    log "\n${YELLOW}--- $1 ---${NC}"
}

# Success message
print_success() {
    log "${GREEN}✅ $1${NC}"
}

# Error message
print_error() {
    log "${RED}❌ $1${NC}"
}

# Warning message
print_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Check if Node.js is available
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
}

# Check if dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies not found. Installing..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            exit 1
        fi
    fi
    print_success "Dependencies are available"
}

# Test network connectivity to controller
test_connectivity() {
    print_section "Testing Network Connectivity"
    
    # Test ping
    if ping -c 3 "$CONTROLLER_IP" &> /dev/null; then
        print_success "Controller is reachable at $CONTROLLER_IP"
    else
        print_warning "Controller ping failed, but UDP might still work"
    fi
    
    # Test UDP port (using nc if available)
    if command -v nc &> /dev/null; then
        if timeout 3 nc -u -z "$CONTROLLER_IP" "$CONTROLLER_PORT" 2>/dev/null; then
            print_success "UDP port $CONTROLLER_PORT is accessible"
        else
            print_warning "UDP port test inconclusive (this is normal for UDP)"
        fi
    fi
}

# Test controller discovery
test_discovery() {
    print_section "Testing Controller Discovery"
    
    log "Running discovery command..."
    DISCOVERY_OUTPUT=$(node app.js cli discover -t 10 2>&1)
    DISCOVERY_EXIT_CODE=$?
    
    log "Discovery output:"
    log "$DISCOVERY_OUTPUT"
    
    if [ $DISCOVERY_EXIT_CODE -eq 0 ]; then
        if echo "$DISCOVERY_OUTPUT" | grep -q "$CONTROLLER_IP"; then
            print_success "Controller discovered at $CONTROLLER_IP"
            
            # Extract serial number from output
            SERIAL_NUMBER=$(echo "$DISCOVERY_OUTPUT" | grep -o "Serial Number.*[0-9]\+" | grep -o "[0-9]\+$" | head -1)
            if [ ! -z "$SERIAL_NUMBER" ]; then
                print_success "Controller serial number: $SERIAL_NUMBER"
                echo "$SERIAL_NUMBER" > /tmp/controller_serial.txt
            fi
        else
            print_warning "Discovery succeeded but controller at $CONTROLLER_IP not found"
        fi
    else
        print_error "Discovery failed with exit code $DISCOVERY_EXIT_CODE"
    fi
}

# Get controller serial number
get_controller_serial() {
    if [ -f "/tmp/controller_serial.txt" ]; then
        CONTROLLER_SERIAL=$(cat /tmp/controller_serial.txt)
    else
        # Try to get from saved controllers
        CONTROLLERS_OUTPUT=$(node app.js cli list 2>&1)
        if echo "$CONTROLLERS_OUTPUT" | grep -q "$CONTROLLER_IP"; then
            CONTROLLER_SERIAL=$(echo "$CONTROLLERS_OUTPUT" | grep "$CONTROLLER_IP" | grep -o "[0-9]\+" | head -1)
        fi
    fi
    
    if [ -z "$CONTROLLER_SERIAL" ]; then
        print_error "Could not determine controller serial number"
        print_warning "Please run discovery first or check if controller is responding"
        return 1
    fi
    
    print_success "Using controller serial: $CONTROLLER_SERIAL"
    return 0
}

# Test listing controllers
test_list_controllers() {
    print_section "Testing List Controllers"
    
    log "Listing saved controllers..."
    LIST_OUTPUT=$(node app.js cli list 2>&1)
    LIST_EXIT_CODE=$?
    
    log "List output:"
    log "$LIST_OUTPUT"
    
    if [ $LIST_EXIT_CODE -eq 0 ]; then
        if echo "$LIST_OUTPUT" | grep -q "$CONTROLLER_IP"; then
            print_success "Controller found in saved list"
        else
            print_warning "Controller not found in saved list"
        fi
    else
        print_error "List command failed"
    fi
}

# Test getting controller time
test_get_time() {
    print_section "Testing Get Controller Time"
    
    if ! get_controller_serial; then
        return 1
    fi
    
    log "Getting time from controller $CONTROLLER_SERIAL..."
    TIME_OUTPUT=$(node app.js cli get time -c "$CONTROLLER_SERIAL" 2>&1)
    TIME_EXIT_CODE=$?
    
    log "Get time output:"
    log "$TIME_OUTPUT"
    
    if [ $TIME_EXIT_CODE -eq 0 ]; then
        if echo "$TIME_OUTPUT" | grep -q "Controller Time:"; then
            CONTROLLER_TIME=$(echo "$TIME_OUTPUT" | grep "Controller Time:" | cut -d: -f2-)
            print_success "Controller time retrieved: $CONTROLLER_TIME"
        else
            print_warning "Time command succeeded but format unexpected"
        fi
    else
        print_error "Get time command failed"
    fi
}

# Test setting controller time
test_set_time() {
    print_section "Testing Set Controller Time"
    
    if ! get_controller_serial; then
        return 1
    fi
    
    log "Setting current system time on controller $CONTROLLER_SERIAL..."
    
    # Create a temporary script to set time non-interactively
    cat > /tmp/set_time_test.js << 'EOF'
const ControllerAPI = require('./src/core/controller-api');

async function setTimeTest() {
    try {
        const api = new ControllerAPI();
        const controllers = await api.getSavedControllers();
        
        const controller = controllers.find(c => c.serialNumber.toString() === process.argv[2]);
        if (!controller) {
            console.error('Controller not found');
            process.exit(1);
        }
        
        const currentTime = new Date();
        console.log('Setting time to:', currentTime.toISOString());
        
        const result = await api.setControllerTime(controller, currentTime);
        console.log('✅ Time set successfully');
        console.log('Set time:', result.setTime.toISOString());
        
    } catch (error) {
        console.error('❌ Failed to set time:', error.message);
        process.exit(1);
    }
}

setTimeTest();
EOF
    
    SET_TIME_OUTPUT=$(node /tmp/set_time_test.js "$CONTROLLER_SERIAL" 2>&1)
    SET_TIME_EXIT_CODE=$?
    
    log "Set time output:"
    log "$SET_TIME_OUTPUT"
    
    if [ $SET_TIME_EXIT_CODE -eq 0 ]; then
        print_success "Controller time set successfully"
    else
        print_error "Set time command failed"
    fi
    
    # Clean up
    rm -f /tmp/set_time_test.js
}

# Test getting server configuration
test_get_server() {
    print_section "Testing Get Server Configuration"
    
    if ! get_controller_serial; then
        return 1
    fi
    
    log "Getting server configuration from controller $CONTROLLER_SERIAL..."
    
    # Create a temporary script to get server config
    cat > /tmp/get_server_test.js << 'EOF'
const ControllerAPI = require('./src/core/controller-api');

async function getServerTest() {
    try {
        const api = new ControllerAPI();
        const controllers = await api.getSavedControllers();
        
        const controller = controllers.find(c => c.serialNumber.toString() === process.argv[2]);
        if (!controller) {
            console.error('Controller not found');
            process.exit(1);
        }
        
        const result = await api.getReceivingServer(controller);
        console.log('✅ Server configuration retrieved');
        console.log('Server IP:', result.serverIp);
        console.log('Port:', result.port);
        console.log('Upload Interval:', result.uploadInterval);
        console.log('Upload Enabled:', result.uploadEnabled);
        
    } catch (error) {
        console.error('❌ Failed to get server config:', error.message);
        process.exit(1);
    }
}

getServerTest();
EOF
    
    SERVER_OUTPUT=$(node /tmp/get_server_test.js "$CONTROLLER_SERIAL" 2>&1)
    SERVER_EXIT_CODE=$?
    
    log "Get server output:"
    log "$SERVER_OUTPUT"
    
    if [ $SERVER_EXIT_CODE -eq 0 ]; then
        print_success "Server configuration retrieved successfully"
    else
        print_error "Get server command failed"
    fi
    
    # Clean up
    rm -f /tmp/get_server_test.js
}

# Test setting server configuration
test_set_server() {
    print_section "Testing Set Server Configuration"
    
    if ! get_controller_serial; then
        return 1
    fi
    
    log "Setting server configuration on controller $CONTROLLER_SERIAL..."
    
    # Create a temporary script to set server config
    cat > /tmp/set_server_test.js << 'EOF'
const ControllerAPI = require('./src/core/controller-api');

async function setServerTest() {
    try {
        const api = new ControllerAPI();
        const controllers = await api.getSavedControllers();
        
        const controller = controllers.find(c => c.serialNumber.toString() === process.argv[2]);
        if (!controller) {
            console.error('Controller not found');
            process.exit(1);
        }
        
        // Test server configuration
        const serverConfig = {
            serverIp: '192.168.2.100',  // Test server IP
            port: 9001,                 // Test port
            uploadInterval: 30          // 30 seconds
        };
        
        console.log('Setting server config:', serverConfig);
        
        const result = await api.setReceivingServer(controller, serverConfig);
        console.log('✅ Server configuration set successfully');
        
    } catch (error) {
        console.error('❌ Failed to set server config:', error.message);
        process.exit(1);
    }
}

setServerTest();
EOF
    
    SET_SERVER_OUTPUT=$(node /tmp/set_server_test.js "$CONTROLLER_SERIAL" 2>&1)
    SET_SERVER_EXIT_CODE=$?
    
    log "Set server output:"
    log "$SET_SERVER_OUTPUT"
    
    if [ $SET_SERVER_EXIT_CODE -eq 0 ]; then
        print_success "Server configuration set successfully"
    else
        print_error "Set server command failed"
    fi
    
    # Clean up
    rm -f /tmp/set_server_test.js
}

# Test network configuration (WARNING: This will restart the controller)
test_set_network() {
    print_section "Testing Set Network Configuration (CAUTION)"
    
    print_warning "Network configuration test will restart the controller!"
    print_warning "This test is DISABLED by default to prevent network issues."
    print_warning "To enable, set ENABLE_NETWORK_TEST=1 in the script."
    
    if [ "$ENABLE_NETWORK_TEST" != "1" ]; then
        log "Skipping network configuration test (safety measure)"
        return 0
    fi
    
    if ! get_controller_serial; then
        return 1
    fi
    
    log "Setting network configuration on controller $CONTROLLER_SERIAL..."
    print_warning "Controller will restart after this operation!"
    
    # Create a temporary script to set network config
    cat > /tmp/set_network_test.js << 'EOF'
const ControllerAPI = require('./src/core/controller-api');

async function setNetworkTest() {
    try {
        const api = new ControllerAPI();
        const controllers = await api.getSavedControllers();
        
        const controller = controllers.find(c => c.serialNumber.toString() === process.argv[2]);
        if (!controller) {
            console.error('Controller not found');
            process.exit(1);
        }
        
        // Keep same network config to avoid losing connection
        const networkConfig = {
            ip: controller.ip,
            subnetMask: controller.subnetMask,
            gateway: controller.gateway
        };
        
        console.log('Setting network config (same as current):', networkConfig);
        
        const result = await api.setControllerNetworkConfig(controller, networkConfig);
        console.log('✅ Network configuration sent (controller will restart)');
        
    } catch (error) {
        console.error('❌ Failed to set network config:', error.message);
        process.exit(1);
    }
}

setNetworkTest();
EOF
    
    SET_NETWORK_OUTPUT=$(node /tmp/set_network_test.js "$CONTROLLER_SERIAL" 2>&1)
    SET_NETWORK_EXIT_CODE=$?
    
    log "Set network output:"
    log "$SET_NETWORK_OUTPUT"
    
    if [ $SET_NETWORK_EXIT_CODE -eq 0 ]; then
        print_success "Network configuration sent successfully"
        print_warning "Controller is restarting..."
        sleep 10  # Wait for restart
    else
        print_error "Set network command failed"
    fi
    
    # Clean up
    rm -f /tmp/set_network_test.js
}

# Test API server functionality
test_api_server() {
    print_section "Testing API Server"
    
    log "Starting API server in background..."
    node app.js server &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test health endpoint
    if command -v curl &> /dev/null; then
        log "Testing health endpoint..."
        HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)
        if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
            print_success "API server health check passed"
        else
            print_error "API server health check failed"
        fi
        
        # Test discovery endpoint
        log "Testing discovery API endpoint..."
        DISCOVERY_API_RESPONSE=$(curl -s -X POST http://localhost:3000/api/discover \
            -H "Content-Type: application/json" \
            -d '{"timeout": 5000}' 2>/dev/null)
        
        if echo "$DISCOVERY_API_RESPONSE" | grep -q "success"; then
            print_success "API discovery endpoint working"
        else
            print_error "API discovery endpoint failed"
        fi
    else
        print_warning "curl not available, skipping API tests"
    fi
    
    # Stop server
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    print_success "API server stopped"
}

# Test using direct communication script
test_direct_communication() {
    print_section "Running Direct Communication Tests"

    log "Starting comprehensive controller test..."
    if [ "$ENABLE_NETWORK_TEST" = "1" ]; then
        log "Network configuration test is ENABLED (controller will restart)"
        export ENABLE_NETWORK_TEST=1
    else
        log "Network configuration test is DISABLED (safety measure)"
    fi

    DIRECT_TEST_OUTPUT=$(node test-direct-communication.js 2>&1)
    DIRECT_TEST_EXIT_CODE=$?

    log "Direct communication test output:"
    log "$DIRECT_TEST_OUTPUT"

    if [ $DIRECT_TEST_EXIT_CODE -eq 0 ]; then
        print_success "Direct communication tests completed"
    else
        print_error "Direct communication tests failed"
    fi
}

# Main test execution
main() {
    print_header "Controller Test Suite - Real Hardware Test"
    log "Testing controller at: $CONTROLLER_IP:$CONTROLLER_PORT"
    log "Test started at: $(date)"
    log "Log file: $TEST_LOG"

    # Pre-flight checks
    print_section "Pre-flight Checks"
    check_nodejs
    check_dependencies

    # Network tests
    test_connectivity

    # Run comprehensive direct communication tests
    test_direct_communication

    # CLI-based tests (backup/alternative)
    print_section "CLI-based Tests (Alternative Method)"
    test_discovery
    test_list_controllers
    test_get_time
    test_set_time
    test_get_server
    test_set_server
    test_set_network  # Disabled by default

    # API server tests
    test_api_server

    # Summary
    print_header "Test Summary"
    log "Test completed at: $(date)"
    log "Full log available in: $TEST_LOG"

    print_success "All available tests completed!"
    print_warning "Check the log file for detailed results: $TEST_LOG"
    print_warning "Also check for JSON results file from direct communication test"

    # Clean up temporary files
    rm -f /tmp/controller_serial.txt
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --enable-network-test)
            ENABLE_NETWORK_TEST=1
            shift
            ;;
        --controller-ip)
            CONTROLLER_IP="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --enable-network-test    Enable network configuration test (CAUTION)"
            echo "  --controller-ip IP       Set controller IP address (default: 192.168.2.66)"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
