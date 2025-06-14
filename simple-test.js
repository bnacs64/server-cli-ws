#!/usr/bin/env node

// Simple test without external dependencies
// Tests the controller discovery with the corrected broadcast addresses

const ControllerAPI = require('./src/core/controller-api');

async function simpleTest() {
    console.log('🧪 Simple Controller Test');
    console.log('========================');
    console.log('');

    const api = new ControllerAPI();

    try {
        console.log('🔍 Testing controller discovery...');
        console.log('Target: 192.168.2.66 (controller should respond from 192.168.2.120)');
        console.log('');

        const controllers = await api.discoverControllers(10000);

        if (controllers.length === 0) {
            console.log('❌ No controllers found');
            console.log('');
            console.log('💡 Troubleshooting:');
            console.log('1. Make sure controller is powered on');
            console.log('2. Check network connectivity: ping 192.168.2.66');
            console.log('3. Verify controller is on same network');
            console.log('4. Try running: node diagnose-controller.js');
            return;
        }

        console.log(`✅ Found ${controllers.length} controller(s):`);
        console.log('');

        controllers.forEach((controller, index) => {
            console.log(`Controller ${index + 1}:`);
            console.log(`  Serial Number: ${controller.serialNumber}`);
            console.log(`  Configured IP: ${controller.ip}`);
            console.log(`  Response from: ${controller.remoteAddress}`);
            console.log(`  MAC Address: ${controller.macAddress}`);
            console.log(`  Driver Version: ${controller.driverVersion}`);
            console.log(`  Release Date: ${controller.driverReleaseDate}`);
            console.log(`  Subnet Mask: ${controller.subnetMask}`);
            console.log(`  Gateway: ${controller.gateway}`);
            console.log('');
        });

        // Test with the first controller
        const controller = controllers[0];
        console.log(`🧪 Testing operations with controller ${controller.serialNumber}...`);
        console.log('');

        // Test 1: Get Time
        try {
            console.log('⏰ Testing get time...');
            const timeResult = await api.getControllerTime(controller);
            console.log(`✅ Controller time: ${timeResult.time.toLocaleString()}`);
            console.log(`   System time: ${new Date().toLocaleString()}`);
            
            const timeDiff = Math.abs(timeResult.time.getTime() - new Date().getTime());
            const diffSeconds = Math.round(timeDiff / 1000);
            console.log(`   Time difference: ${diffSeconds} seconds`);
            console.log('');
        } catch (error) {
            console.log(`❌ Get time failed: ${error.message}`);
            console.log('');
        }

        // Test 2: Set Time
        try {
            console.log('⏰ Testing set time...');
            const currentTime = new Date();
            const setTimeResult = await api.setControllerTime(controller, currentTime);
            console.log(`✅ Time set to: ${setTimeResult.setTime.toLocaleString()}`);
            console.log('');
        } catch (error) {
            console.log(`❌ Set time failed: ${error.message}`);
            console.log('');
        }

        // Test 3: Get Server Config
        try {
            console.log('📡 Testing get server configuration...');
            const serverResult = await api.getReceivingServer(controller);
            console.log(`✅ Server configuration:`);
            console.log(`   Server IP: ${serverResult.serverIp}`);
            console.log(`   Port: ${serverResult.port}`);
            console.log(`   Upload interval: ${serverResult.uploadInterval}s`);
            console.log(`   Upload enabled: ${serverResult.uploadEnabled}`);
            console.log('');
        } catch (error) {
            console.log(`❌ Get server config failed: ${error.message}`);
            console.log('');
        }

        // Test 4: Set Server Config
        try {
            console.log('📡 Testing set server configuration...');
            const serverConfig = {
                serverIp: '192.168.2.100',
                port: 9001,
                uploadInterval: 30
            };
            
            console.log(`   Setting: ${serverConfig.serverIp}:${serverConfig.port}, interval: ${serverConfig.uploadInterval}s`);
            const setServerResult = await api.setReceivingServer(controller, serverConfig);
            console.log(`✅ Server configuration set successfully`);
            console.log('');
        } catch (error) {
            console.log(`❌ Set server config failed: ${error.message}`);
            console.log('');
        }

        console.log('🎉 All tests completed!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   Controller Serial: ${controller.serialNumber}`);
        console.log(`   Controller IP: ${controller.ip} (responds from ${controller.remoteAddress})`);
        console.log(`   Driver Version: ${controller.driverVersion}`);
        console.log(`   MAC Address: ${controller.macAddress}`);

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log('');
        console.log('💡 Try running the diagnostic: node diagnose-controller.js');
    }
}

// Run the test
if (require.main === module) {
    simpleTest();
}

module.exports = simpleTest;
