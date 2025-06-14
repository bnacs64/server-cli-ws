# Network Testing Guide

Comprehensive guide for testing all controller network functions and interfaces.

## Overview

This guide covers systematic testing of all network-related controller functions including:

- **Network Discovery** (Function ID 0x94)
- **Network Configuration** (Function ID 0x96) 
- **Time Synchronization** (Function IDs 0x32/0x30)
- **Receiving Server Configuration** (Function IDs 0x92/0x90)
- **Protocol Validation** and compliance testing
- **Missing Function Analysis** and implementation guidance

## Test Scripts

### 1. Comprehensive Network Test Suite

**File**: `scripts/test-network-comprehensive.js`

The main test suite that validates all network functions:

```bash
# Run all network tests
node scripts/test-network-comprehensive.js

# Expected output: Comprehensive test report with all network functions
```

**Features**:
- ✅ Tests all implemented network functions
- ✅ Validates protocol compliance
- ✅ Follows get-current-values-first pattern (no permanent changes)
- ✅ Accounts for controller discovery response behavior
- ✅ Generates detailed test reports
- ✅ Saves results to JSON files

### 2. Cross-Platform Wrapper Scripts

#### Windows PowerShell
```powershell
# Run all tests
.\scripts\test-network-functions.ps1

# Run specific test type
.\scripts\test-network-functions.ps1 -TestType discovery -Timeout 15000

# Run with verbose logging
.\scripts\test-network-functions.ps1 -LogLevel verbose
```

#### Unix/Linux/macOS Bash
```bash
# Make script executable
chmod +x scripts/test-network-functions.sh

# Run all tests
./scripts/test-network-functions.sh

# Run specific test type
./scripts/test-network-functions.sh --type discovery --timeout 15000

# Run with verbose logging
./scripts/test-network-functions.sh --log-level verbose
```

### 3. Missing Functions Analysis

**File**: `scripts/test-missing-functions.js`

Analyzes SDK functions not yet implemented:

```bash
node scripts/test-missing-functions.js
```

**Identifies**:
- Query Status (Function ID 0x20) - Real-time monitoring
- Door Control Parameters (Function IDs 0x80/0x82)
- Implementation guidance and code templates

## Test Categories

### 1. Network Discovery Testing

**Function ID**: 0x94  
**Purpose**: UDP broadcast discovery on port 60000

**Tests**:
- ✅ Broadcast packet transmission
- ✅ Response parsing and validation
- ✅ Controller information extraction
- ✅ Network behavior validation (NAT/routing detection)

**Expected Behavior**:
- Controller at 192.168.2.66 responds from 192.168.2.120 during discovery
- Returns serial number, IP configuration, MAC address, driver version

### 2. Time Synchronization Testing

**Function IDs**: 0x32 (Get), 0x30 (Set)  
**Purpose**: Controller time management with BCD encoding

**Tests**:
- ✅ Get current controller time
- ✅ BCD encoding/decoding validation
- ✅ Set time operation (using same time for safety)
- ✅ Time difference calculation

**Safety Approach**:
- Gets current time first
- Sets same time back (no permanent change)
- Restores original time after testing

### 3. Receiving Server Configuration Testing

**Function IDs**: 0x92 (Get), 0x90 (Set)  
**Purpose**: Configure data receiving server for uploads

**Tests**:
- ✅ Get current server configuration
- ✅ IP address and port parsing
- ✅ Upload interval validation
- ✅ Set server configuration (using same values)

**Configuration Fields**:
- Server IP address
- Communication port
- Upload interval (0 = disabled)

### 4. Network Configuration Testing

**Function ID**: 0x96 (Set only)  
**Purpose**: Configure controller IP, subnet, gateway

**Tests**:
- ✅ Network configuration data validation
- ✅ IP address format validation
- ✅ Packet structure simulation
- ⚠️ **Note**: Actual setting would restart controller

**Safety Approach**:
- Simulates packet creation without sending
- Validates data structure and format
- Does not actually change network settings

### 5. Protocol Validation Testing

**Purpose**: Verify SDK compliance and communication patterns

**Tests**:
- ✅ Packet format compliance (64 bytes, type 0x17)
- ✅ Function ID validation
- ✅ Discovery response behavior analysis
- ✅ NAT/routing detection
- ✅ BCD encoding verification

## Controller Hardware Setup

### Physical Connection
- **Controller IP**: 192.168.2.66
- **Subnet**: 255.255.255.0
- **Gateway**: 192.168.2.1
- **Discovery Response IP**: 192.168.2.120 (NAT/routing behavior)

### Network Requirements
- **UDP Port 60000**: Controller communication
- **Firewall**: Allow UDP broadcast and unicast
- **Network Access**: Same subnet or routed access

## Test Results and Reporting

### Result Files
Test results are saved to `logs/` directory:
- `network_test_results_TIMESTAMP.json` - Comprehensive test results
- `test_results_TIMESTAMP.json` - Basic test results

### Result Structure
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "testSuite": "Comprehensive Network Functions Test",
  "controller": {
    "serialNumber": 423152284,
    "ip": "192.168.2.66",
    "remoteAddress": "192.168.2.120",
    "macAddress": "00:57:19:38:ca:9c",
    "driverVersion": "6.26"
  },
  "summary": {
    "totalTests": 12,
    "passedTests": 12,
    "failedTests": 0,
    "successRate": 100,
    "totalDuration": 5432
  },
  "testResults": [...],
  "originalSettings": {...}
}
```

## Expected Test Output

### Successful Discovery
```
✅ Found 1 controller(s):
Controller 1:
  Serial Number: 423152284
  Configured IP: 192.168.2.66
  Response from: 192.168.2.120
  Subnet Mask: 255.255.255.0
  Gateway: 192.168.2.1
  MAC Address: 00:57:19:38:ca:9c
  Driver Version: 6.26
  Release Date: 2021-09-15
```

### Time Synchronization
```
✅ Controller time: 2024-01-15 14:30:45
   System time: 2024-01-15 14:30:47
   Time difference: 2 seconds
✅ Time set successfully
✅ Original time restored
```

### Server Configuration
```
✅ Current server configuration:
   Server IP: 192.168.2.121
   Port: 60666
   Upload interval: 0s
   Upload enabled: false
✅ Server configuration set successfully
✅ Original configuration restored
```

## Troubleshooting

### Controller Not Discovered
1. **Check network connectivity**:
   ```bash
   ping 192.168.2.66
   ```

2. **Verify controller power and network connection**

3. **Check firewall settings**:
   - Allow UDP port 60000
   - Allow broadcast packets

### Test Failures
1. **Timeout errors**: Increase discovery timeout
2. **Network errors**: Check controller IP and connectivity
3. **Permission errors**: Ensure UDP port access

### Common Issues
- **NAT/Routing**: Controller may respond from different IP during discovery
- **Firewall**: UDP broadcast packets may be blocked
- **Network Segmentation**: Controller may be on different subnet

## Implementation Status

### ✅ Implemented Functions
- Network Discovery (0x94)
- Set Network Configuration (0x96)
- Get/Set Time (0x32/0x30)
- Get/Set Receiving Server (0x92/0x90)

### ❌ Missing Functions
- Query Status (0x20) - Real-time monitoring
- Get/Set Door Control Parameters (0x82/0x80)

### 📋 Implementation Priority
1. **High**: Query Status (0x20) for real-time monitoring
2. **Medium**: Door Control Parameters (0x80/0x82)
3. **Low**: Access control functions (privileges, records)

## Running Tests

### Quick Start
```bash
# Run comprehensive network tests
node scripts/test-network-comprehensive.js

# Analyze missing functions
node scripts/test-missing-functions.js

# Cross-platform wrapper (Windows)
.\scripts\test-network-functions.ps1

# Cross-platform wrapper (Unix)
./scripts/test-network-functions.sh
```

### Test Options
- **Test Type**: all, discovery, time, server, network, protocol
- **Timeout**: Discovery timeout in milliseconds
- **Log Level**: info, verbose, quiet
- **Save Results**: Enable/disable result file generation

## Safety Features

All tests follow a **safe testing approach**:
- ✅ Gets current values before any changes
- ✅ Uses same values for set operations (no permanent changes)
- ✅ Restores original settings after testing
- ✅ Simulates dangerous operations (network config changes)
- ✅ Clear warnings for operations that restart controller

This ensures **no permanent changes** are made to the controller during testing.
