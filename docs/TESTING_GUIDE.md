# Testing Guide for Real Controller

This guide explains how to test all implemented functions with your real controller.

## 🎯 Quick Start

### Cross-Platform Testing
```bash
# Main test script (recommended)
node scripts/test-controller.js

# Windows launcher
scripts\test.bat

# Unix/Linux/macOS launcher
./run-tests.sh
```

## 🧪 Test Features

### Safe Testing Approach
- ✅ **Get-then-set**: Gets current values before testing
- ✅ **Same values**: Sets the same values for safe testing
- ✅ **Auto-restore**: Restores original settings after testing
- ✅ **No permanent changes**: Controller settings remain unchanged

### Tests Performed
- ✅ **Discovery**: Find controllers on network
- ✅ **Time Operations**: Get/set controller time
- ✅ **Server Config**: Get/set receiving server settings
- ✅ **Protocol Validation**: Verify packet format and BCD encoding

## 📋 Expected Test Results

### Successful Discovery Output
```
✅ Found 1 controller(s):

Controller 1:
  Serial: 423152284
  Configured IP: 192.168.2.66
  Response from: 192.168.2.120
  MAC: 00:57:19:38:ca:9c
  Driver: 6.26
  Release: 2021-09-15
```

### Time Test Output
```
✅ Controller time: 2024-01-15 14:30:45
   System time: 2024-01-15 14:30:47
   Time difference: 2 seconds
✅ Time set to: 2024-01-15 14:30:47
✅ Original time restored
```

### Server Configuration Output
```
✅ Current server configuration:
   Server IP: 192.168.2.121
   Port: 60666
   Upload interval: 0s
   Upload enabled: false
✅ Server configuration set successfully (same values)
✅ Original server configuration restored
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

4. **Network interface issues**:
   - Ensure controller is on same subnet
   - Check if multiple network interfaces exist

### Communication Timeouts
1. **Check network latency**:
   ```bash
   ping -c 10 192.168.2.66
   ```

2. **Verify UDP port accessibility**

### Permission Errors
1. **macOS/Linux**: Run with appropriate permissions
2. **Windows**: Run as administrator if needed
3. **Check UDP socket permissions**

### Protocol Issues
- **BCD conversion errors**: Should not occur with valid dates
- **Packet format errors**: Check 64-byte packet structure
- **Function ID errors**: Verify SDK compliance

## 📊 Test Results

### Output Files
- **Console output**: Real-time test progress
- **JSON results**: `logs/test_results_YYYY-MM-DDTHH-MM-SS.json`

### JSON Results Format
```json
{
  "timestamp": "2024-01-15T14:30:45.123Z",
  "controller": {
    "serialNumber": 423152284,
    "ip": "192.168.2.66",
    "remoteAddress": "192.168.2.120",
    "macAddress": "00:57:19:38:ca:9c",
    "driverVersion": "6.26"
  },
  "originalSettings": {
    "time": "2024-01-15T14:30:45.000Z",
    "server": {
      "serverIp": "192.168.2.121",
      "port": 60666,
      "uploadInterval": 0,
      "uploadEnabled": false
    }
  },
  "testResults": [
    {
      "test": "discovery",
      "success": true,
      "message": "Controller found: 423152284",
      "timestamp": "2024-01-15T14:30:45.123Z"
    }
  ],
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0
  }
}
```

## 🎯 Alternative Testing Methods

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

### Manual Testing
```bash
# Individual operations
node -e "
const ControllerAPI = require('./src/core/controller-api');
const api = new ControllerAPI();
api.discoverControllers(5000).then(console.log);
"
```

## 📞 Support

If tests fail:
1. Check this troubleshooting guide
2. Review the detailed log files in `logs/`
3. Verify controller specifications match the SDK
4. Test with a simple ping first
5. Check if controller firmware version is compatible

## ⚡ Quick Diagnostic

**For immediate testing**:
```bash
# 1. Make sure Node.js is installed
node --version

# 2. Install dependencies
npm install

# 3. Run comprehensive test
node scripts/test-controller.js

# 4. Check results
cat logs/test_results_*.json
```

This will test all core functionality safely without risking permanent changes to your controller configuration.
