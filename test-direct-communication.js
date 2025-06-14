#!/usr/bin/env node

// Direct communication test with controller at 192.168.2.66
// Tests all implemented functions using raw packet communication

const ControllerAPI = require('./src/core/controller-api');
const PacketHandler = require('./src/core/packet-handler');

const CONTROLLER_IP = '192.168.2.66';
const TEST_TIMEOUT = 10000; // 10 seconds

class ControllerTester {
    constructor() {
        this.api = new ControllerAPI();
        this.packetHandler = new PacketHandler();
        this.controllerInfo = null;
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'test': '🧪'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    addResult(test, success, message, data = null) {
        this.testResults.push({
            test,
            success,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    async testDiscovery() {
        this.log('Testing controller discovery...', 'test');
        
        try {
            const controllers = await this.api.discoverControllers(TEST_TIMEOUT);
            
            if (controllers.length === 0) {
                this.addResult('discovery', false, 'No controllers discovered');
                this.log('No controllers found during discovery', 'error');
                return false;
            }

            // Look for our specific controller
            const targetController = controllers.find(c => 
                c.ip === CONTROLLER_IP || c.remoteAddress === CONTROLLER_IP
            );

            if (targetController) {
                this.controllerInfo = targetController;
                this.addResult('discovery', true, `Controller found at ${CONTROLLER_IP}`, targetController);
                this.log(`Controller discovered: Serial ${targetController.serialNumber}, IP ${targetController.ip}`, 'success');
                this.log(`  MAC: ${targetController.macAddress}`, 'info');
                this.log(`  Driver: ${targetController.driverVersion}`, 'info');
                this.log(`  Release: ${targetController.driverReleaseDate}`, 'info');
                return true;
            } else {
                this.addResult('discovery', false, `Controller at ${CONTROLLER_IP} not found in discovery results`);
                this.log(`Controller at ${CONTROLLER_IP} not found in discovery results`, 'error');
                this.log('Found controllers:', 'info');
                controllers.forEach(c => {
                    this.log(`  - ${c.serialNumber}: ${c.ip} (${c.macAddress})`, 'info');
                });
                return false;
            }
        } catch (error) {
            this.addResult('discovery', false, `Discovery failed: ${error.message}`);
            this.log(`Discovery failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testGetTime() {
        this.log('Testing get controller time...', 'test');
        
        if (!this.controllerInfo) {
            this.addResult('get_time', false, 'No controller info available');
            this.log('No controller info available for time test', 'error');
            return false;
        }

        try {
            const result = await this.api.getControllerTime(this.controllerInfo);
            this.addResult('get_time', true, 'Time retrieved successfully', result);
            this.log(`Controller time: ${result.time.toLocaleString()}`, 'success');
            this.log(`System time: ${new Date().toLocaleString()}`, 'info');
            
            // Calculate time difference
            const timeDiff = Math.abs(result.time.getTime() - new Date().getTime());
            const diffSeconds = Math.round(timeDiff / 1000);
            this.log(`Time difference: ${diffSeconds} seconds`, 'info');
            
            return true;
        } catch (error) {
            this.addResult('get_time', false, `Get time failed: ${error.message}`);
            this.log(`Get time failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testSetTime() {
        this.log('Testing set controller time...', 'test');
        
        if (!this.controllerInfo) {
            this.addResult('set_time', false, 'No controller info available');
            this.log('No controller info available for set time test', 'error');
            return false;
        }

        try {
            const currentTime = new Date();
            const result = await this.api.setControllerTime(this.controllerInfo, currentTime);
            this.addResult('set_time', true, 'Time set successfully', result);
            this.log(`Time set to: ${result.setTime.toLocaleString()}`, 'success');
            return true;
        } catch (error) {
            this.addResult('set_time', false, `Set time failed: ${error.message}`);
            this.log(`Set time failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testGetServerConfig() {
        this.log('Testing get server configuration...', 'test');
        
        if (!this.controllerInfo) {
            this.addResult('get_server', false, 'No controller info available');
            this.log('No controller info available for server config test', 'error');
            return false;
        }

        try {
            const result = await this.api.getReceivingServer(this.controllerInfo);
            this.addResult('get_server', true, 'Server config retrieved successfully', result);
            this.log(`Server IP: ${result.serverIp}`, 'success');
            this.log(`Port: ${result.port}`, 'info');
            this.log(`Upload interval: ${result.uploadInterval}s`, 'info');
            this.log(`Upload enabled: ${result.uploadEnabled}`, 'info');
            return true;
        } catch (error) {
            this.addResult('get_server', false, `Get server config failed: ${error.message}`);
            this.log(`Get server config failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testSetServerConfig() {
        this.log('Testing set server configuration...', 'test');
        
        if (!this.controllerInfo) {
            this.addResult('set_server', false, 'No controller info available');
            this.log('No controller info available for set server config test', 'error');
            return false;
        }

        try {
            const serverConfig = {
                serverIp: '192.168.2.100',  // Test server IP
                port: 9001,                 // Test port
                uploadInterval: 30          // 30 seconds
            };

            this.log(`Setting server config: ${serverConfig.serverIp}:${serverConfig.port}`, 'info');
            const result = await this.api.setReceivingServer(this.controllerInfo, serverConfig);
            this.addResult('set_server', true, 'Server config set successfully', result);
            this.log('Server configuration set successfully', 'success');
            return true;
        } catch (error) {
            this.addResult('set_server', false, `Set server config failed: ${error.message}`);
            this.log(`Set server config failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testNetworkConfig() {
        this.log('Testing network configuration (CAUTION: Controller will restart)...', 'test');
        this.log('This test is DISABLED by default to prevent network issues', 'warning');
        
        // Check if network test is explicitly enabled
        if (process.env.ENABLE_NETWORK_TEST !== '1') {
            this.addResult('set_network', null, 'Test skipped for safety (set ENABLE_NETWORK_TEST=1 to enable)');
            this.log('Network test skipped for safety. Set ENABLE_NETWORK_TEST=1 to enable.', 'warning');
            return null;
        }

        if (!this.controllerInfo) {
            this.addResult('set_network', false, 'No controller info available');
            this.log('No controller info available for network config test', 'error');
            return false;
        }

        try {
            // Use current network settings to avoid losing connection
            const networkConfig = {
                ip: this.controllerInfo.ip,
                subnetMask: this.controllerInfo.subnetMask,
                gateway: this.controllerInfo.gateway
            };

            this.log('Setting network config (same as current to avoid connection loss)', 'warning');
            this.log(`IP: ${networkConfig.ip}, Mask: ${networkConfig.subnetMask}, Gateway: ${networkConfig.gateway}`, 'info');
            
            const result = await this.api.setControllerNetworkConfig(this.controllerInfo, networkConfig);
            this.addResult('set_network', true, 'Network config sent (controller restarting)', result);
            this.log('Network configuration sent. Controller will restart.', 'success');
            return true;
        } catch (error) {
            this.addResult('set_network', false, `Set network config failed: ${error.message}`);
            this.log(`Set network config failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testBCDConversion() {
        this.log('Testing BCD conversion utilities...', 'test');
        
        try {
            // Test various dates
            const testDates = [
                new Date('2024-01-15 14:30:45'),
                new Date('2023-12-31 23:59:59'),
                new Date('2025-06-01 00:00:00')
            ];

            let allPassed = true;
            
            for (const testDate of testDates) {
                const bcdData = this.packetHandler.dateToBCD(testDate);
                const convertedBack = this.packetHandler.bcdToDate(bcdData);
                
                const matches = testDate.getTime() === convertedBack.getTime();
                if (!matches) {
                    allPassed = false;
                    this.log(`BCD conversion failed for ${testDate.toISOString()}`, 'error');
                } else {
                    this.log(`BCD conversion OK for ${testDate.toISOString()}`, 'info');
                }
            }

            this.addResult('bcd_conversion', allPassed, allPassed ? 'All BCD conversions passed' : 'Some BCD conversions failed');
            if (allPassed) {
                this.log('All BCD conversion tests passed', 'success');
            }
            return allPassed;
        } catch (error) {
            this.addResult('bcd_conversion', false, `BCD conversion test failed: ${error.message}`);
            this.log(`BCD conversion test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testPacketCreation() {
        this.log('Testing packet creation and parsing...', 'test');
        
        try {
            // Test discovery packet
            const discoveryPacket = this.packetHandler.createPacket(0x94, 0);
            if (discoveryPacket.length !== 64) {
                throw new Error(`Invalid packet size: ${discoveryPacket.length}`);
            }

            // Test packet parsing
            const parsed = this.packetHandler.parsePacket(discoveryPacket);
            if (parsed.type !== 0x17 || parsed.functionId !== 0x94) {
                throw new Error('Packet parsing failed');
            }

            this.addResult('packet_creation', true, 'Packet creation and parsing tests passed');
            this.log('Packet creation and parsing tests passed', 'success');
            return true;
        } catch (error) {
            this.addResult('packet_creation', false, `Packet test failed: ${error.message}`);
            this.log(`Packet test failed: ${error.message}`, 'error');
            return false;
        }
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('TEST SUMMARY', 'info');
        this.log('='.repeat(60), 'info');

        const passed = this.testResults.filter(r => r.success === true).length;
        const failed = this.testResults.filter(r => r.success === false).length;
        const skipped = this.testResults.filter(r => r.success === null).length;

        this.log(`Total tests: ${this.testResults.length}`, 'info');
        this.log(`Passed: ${passed}`, 'success');
        this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
        this.log(`Skipped: ${skipped}`, skipped > 0 ? 'warning' : 'info');

        this.log('\nDetailed Results:', 'info');
        this.testResults.forEach(result => {
            const status = result.success === true ? '✅' : result.success === false ? '❌' : '⏭️';
            this.log(`${status} ${result.test}: ${result.message}`, 'info');
        });

        if (this.controllerInfo) {
            this.log('\nController Information:', 'info');
            this.log(`Serial Number: ${this.controllerInfo.serialNumber}`, 'info');
            this.log(`IP Address: ${this.controllerInfo.ip}`, 'info');
            this.log(`MAC Address: ${this.controllerInfo.macAddress}`, 'info');
            this.log(`Driver Version: ${this.controllerInfo.driverVersion}`, 'info');
            this.log(`Release Date: ${this.controllerInfo.driverReleaseDate}`, 'info');
        }

        // Save results to file
        const resultsFile = `test_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        require('fs').writeFileSync(resultsFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            controllerIp: CONTROLLER_IP,
            controllerInfo: this.controllerInfo,
            results: this.testResults,
            summary: { total: this.testResults.length, passed, failed, skipped }
        }, null, 2));

        this.log(`\nResults saved to: ${resultsFile}`, 'info');
    }

    async runAllTests() {
        this.log(`Starting comprehensive test of controller at ${CONTROLLER_IP}`, 'info');
        this.log(`Test timeout: ${TEST_TIMEOUT}ms`, 'info');
        this.log('', 'info');

        // Run all tests
        await this.testBCDConversion();
        await this.testPacketCreation();
        await this.testDiscovery();
        
        if (this.controllerInfo) {
            await this.testGetTime();
            await this.testSetTime();
            await this.testGetServerConfig();
            await this.testSetServerConfig();
            await this.testNetworkConfig();
        } else {
            this.log('Skipping controller-specific tests due to discovery failure', 'warning');
        }

        this.printSummary();
    }
}

// Main execution
async function main() {
    const tester = new ControllerTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = ControllerTester;
