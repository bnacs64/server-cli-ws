# Testing Guide for Real Controller

This guide explains how to test all implemented functions with your real controller at **192.168.2.66**.

## 🎯 Available Test Scripts

### 1. Direct Communication Test (Recommended)
**File**: `test-direct-communication.js`
**Description**: Comprehensive test using direct packet communication

```bash
# Run all tests
node test-direct-communication.js

# Enable network configuration test (CAUTION: Controller will restart)
ENABLE_NETWORK_TEST=1 node test-direct-communication.js
```

### 2. Bash Test Suite
**File**: `test-controller.sh`
**Description**: Complete test suite with multiple testing methods

```bash
# Make executable and run
chmod +x test-controller.sh
./test-controller.sh

# With network test enabled
./test-controller.sh --enable-network-test

# Different controller IP
./test-controller.sh --controller-ip 192.168.1.100
```

## 🧪 Tests Performed

### Core Communication Tests
- ✅ **BCD Conversion**: Date/time encoding/decoding
- ✅ **Packet Creation**: 64-byte packet format validation
- ✅ **UDP Communication**: Network connectivity

### Controller Function Tests
- ✅ **Discovery** (Function ID 0x94): Find controller on network
- ✅ **Get Time** (Function ID 0x32): Retrieve controller time
- ✅ **Set Time** (Function ID 0x30): Set controller time to current system time
- ✅ **Get Server Config** (Function ID 0x92): Retrieve receiving server settings
- ✅ **Set Server Config** (Function ID 0x90): Configure data receiving server
- ⚠️ **Set Network Config** (Function ID 0x96): Network settings (DISABLED by default)

### API Interface Tests
- ✅ **CLI Commands**: Test command-line interface
- ✅ **REST API**: Test HTTP endpoints
- ✅ **WebSocket**: Test real-time communication

## 🚨 Important Safety Notes

### Network Configuration Test
The network configuration test is **DISABLED by default** because:
- It will **restart the controller**
- Could potentially **change network settings**
- Might cause **loss of connectivity**

To enable it:
```bash
# Direct test
ENABLE_NETWORK_TEST=1 node test-direct-communication.js

# Bash suite
./test-controller.sh --enable-network-test
```

## 📋 Expected Test Results

### Successful Discovery Output
```
✅ Controller discovered: Serial 223000123, IP 192.168.2.66
   MAC: 00:11:22:33:44:55
   Driver: 6.56
   Release: 2015-04-29
```

### Time Test Output
```
✅ Controller time: 2024-01-15 14:30:45
   System time: 2024-01-15 14:30:47
   Time difference: 2 seconds
✅ Time set to: 2024-01-15 14:30:47
```

### Server Configuration Output
```
✅ Server IP: 192.168.2.100
   Port: 9001
   Upload interval: 30s
   Upload enabled: true
✅ Server configuration set successfully
```

## 🔧 Troubleshooting

### Controller Not Discovered
1. **Check network connectivity**:
   ```bash
   ping 192.168.2.66
   ```

2. **Verify controller is powered on**

3. **Check firewall settings**:
   - Allow UDP port 60000
   - Allow broadcast packets

4. **Try different broadcast addresses**:
   The discovery uses multiple broadcast addresses automatically

### Communication Timeouts
1. **Increase timeout**:
   ```javascript
   // In test-direct-communication.js
   const TEST_TIMEOUT = 15000; // 15 seconds
   ```

2. **Check network latency**:
   ```bash
   ping -c 10 192.168.2.66
   ```

### Permission Errors
1. **macOS/Linux**: Run with sudo if needed
   ```bash
   sudo node test-direct-communication.js
   ```

2. **Check UDP socket permissions**

### BCD Conversion Errors
- These indicate a bug in the implementation
- Should not occur with valid dates
- Check the test output for specific failures

## 📊 Test Results

### Output Files
- **Console output**: Real-time test progress
- **Log file**: `controller_test_YYYYMMDD_HHMMSS.log`
- **JSON results**: `test_results_YYYY-MM-DDTHH-MM-SS.json`

### JSON Results Format
```json
{
  "timestamp": "2024-01-15T14:30:45.123Z",
  "controllerIp": "192.168.2.66",
  "controllerInfo": {
    "serialNumber": 223000123,
    "ip": "192.168.2.66",
    "macAddress": "00:11:22:33:44:55",
    "driverVersion": "6.56"
  },
  "results": [
    {
      "test": "discovery",
      "success": true,
      "message": "Controller found at 192.168.2.66",
      "timestamp": "2024-01-15T14:30:45.123Z"
    }
  ],
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 0,
    "skipped": 1
  }
}
```

## 🎯 Quick Test Commands

### Basic Functionality Test
```bash
# Just test if controller responds
node test-direct-communication.js
```

### Full Test with Network Config
```bash
# CAUTION: Controller will restart
ENABLE_NETWORK_TEST=1 node test-direct-communication.js
```

### CLI-based Testing
```bash
# Discovery only
node app.js cli discover

# Get time
node app.js cli get time -c SERIAL_NUMBER

# Interactive mode
node app.js cli interactive
```

### API Server Testing
```bash
# Start server
node app.js server &

# Test discovery endpoint
curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{"timeout": 5000}'

# Stop server
kill %1
```

## 📞 Support

If tests fail:
1. Check this troubleshooting guide
2. Review the detailed log files
3. Verify controller specifications match the SDK
4. Test with a simple ping first
5. Check if controller firmware version is compatible (should be 6.56+)

## ⚡ Quick Start

**For immediate testing**:
```bash
# 1. Make sure Node.js is installed
node --version

# 2. Install dependencies
npm install

# 3. Run comprehensive test
node test-direct-communication.js

# 4. Check results
cat test_results_*.json
```

This will test all core functionality safely without risking network configuration changes.
