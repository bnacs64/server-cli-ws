#!/usr/bin/env node

/**
 * Production Controller Test Suite
 * Cross-platform testing with safe get-then-set-same-values approach
 */

const path = require('path');
const ControllerAPI = require('../src/core/controller-api');

class ControllerTest {
    constructor() {
        this.api = new ControllerAPI();
        this.testResults = [];
        this.originalSettings = {};
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
        this.log('Testing enhanced controller discovery...', 'test');

        try {
            // Show network information first
            const networkInfo = this.api.getNetworkInfo();
            this.log(`Platform: ${networkInfo.platform}`, 'info');
            this.log(`Found ${networkInfo.interfaces.length} network interface(s)`, 'info');

            networkInfo.interfaces.forEach((iface, index) => {
                this.log(`  ${index + 1}. ${iface.name} (${iface.type}) - ${iface.address}`, 'info');
            });

            // Enhanced discovery with retry mechanisms
            const discoveryOptions = {
                enableRetry: true,
                enableUnicastFallback: true,
                enableInterfaceDetection: true,
                maxRetries: 3,
                retryDelay: 1000,
                exponentialBackoff: true,
                logLevel: 'info'
            };

            this.log('Starting enhanced discovery with retry mechanisms...', 'info');
            const controllers = await this.api.discoverControllers(10000, discoveryOptions);

            if (controllers.length === 0) {
                this.log('No controllers found with enhanced discovery', 'warning');

                // Run network diagnostics for troubleshooting
                this.log('Running network diagnostics for troubleshooting...', 'info');
                try {
                    const diagnostics = await this.api.runNetworkDiagnostics();

                    this.log('Network diagnostic results:', 'info');
                    this.log(`  Network interfaces: ${diagnostics.networkInterfaces.length}`, 'info');
                    this.log(`  Connectivity tests: ${diagnostics.connectivityTests.length}`, 'info');

                    diagnostics.connectivityTests.forEach(test => {
                        if (test.reachable) {
                            this.log(`    ✅ ${test.targetIP}: Reachable (${test.responseTime}ms)`, 'success');
                        } else {
                            this.log(`    ❌ ${test.targetIP}: ${test.error}`, 'warning');
                        }
                    });

                    this.log('Recommendations:', 'info');
                    diagnostics.recommendations.forEach(rec => {
                        const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                        this.log(`  ${icon} ${rec.message}`, 'info');
                        this.log(`     Action: ${rec.action}`, 'info');
                    });

                    this.addResult('discovery', false, 'No controllers discovered (diagnostics completed)', diagnostics);
                } catch (diagError) {
                    this.log(`Network diagnostics failed: ${diagError.message}`, 'error');
                    this.addResult('discovery', false, 'No controllers discovered (diagnostics failed)');
                }

                return null;
            }

            this.log(`Found ${controllers.length} controller(s) with enhanced discovery:`, 'success');

            controllers.forEach((controller, index) => {
                this.log(`Controller ${index + 1}:`, 'info');
                this.log(`  Serial: ${controller.serialNumber}`, 'info');
                this.log(`  Configured IP: ${controller.ip}`, 'info');
                this.log(`  Response from: ${controller.remoteAddress}`, 'info');
                this.log(`  MAC: ${controller.macAddress}`, 'info');
                this.log(`  Driver: ${controller.driverVersion}`, 'info');
                this.log(`  Release: ${controller.driverReleaseDate}`, 'info');

                // Show network behavior if different
                if (controller.ip !== controller.remoteAddress) {
                    this.log(`  ℹ️  Network Behavior: Controller responds from different IP (NAT/routing)`, 'info');
                }
            });

            const controller = controllers[0];
            this.addResult('discovery', true, `Enhanced discovery successful: ${controller.serialNumber}`, {
                controller,
                networkInfo,
                discoveryOptions
            });
            return controller;

        } catch (error) {
            this.addResult('discovery', false, `Enhanced discovery failed: ${error.message}`);
            this.log(`Enhanced discovery failed: ${error.message}`, 'error');
            return null;
        }
    }

    async testTimeOperations(controller) {
        this.log('Testing time operations...', 'test');

        // Get current time first
        try {
            this.log('Getting current controller time...', 'info');
            const currentTimeResult = await this.api.getControllerTime(controller);
            this.originalSettings.time = currentTimeResult.time;
            
            this.log(`Controller time: ${currentTimeResult.time.toLocaleString()}`, 'success');
            this.log(`System time: ${new Date().toLocaleString()}`, 'info');
            
            const timeDiff = Math.abs(currentTimeResult.time.getTime() - new Date().getTime());
            const diffSeconds = Math.round(timeDiff / 1000);
            this.log(`Time difference: ${diffSeconds} seconds`, 'info');
            
            this.addResult('get_time', true, 'Time retrieved successfully', currentTimeResult);
        } catch (error) {
            this.addResult('get_time', false, `Get time failed: ${error.message}`);
            this.log(`Get time failed: ${error.message}`, 'error');
            return;
        }

        // Set time to current system time (for testing)
        try {
            this.log('Setting controller time to current system time...', 'info');
            const systemTime = new Date();
            const setTimeResult = await this.api.setControllerTime(controller, systemTime);
            
            this.log(`Time set to: ${setTimeResult.setTime.toLocaleString()}`, 'success');
            this.addResult('set_time', true, 'Time set successfully', setTimeResult);
        } catch (error) {
            this.addResult('set_time', false, `Set time failed: ${error.message}`);
            this.log(`Set time failed: ${error.message}`, 'error');
        }
    }

    async testServerOperations(controller) {
        this.log('Testing server configuration operations...', 'test');

        // Get current server configuration first
        try {
            this.log('Getting current server configuration...', 'info');
            const currentServerConfig = await this.api.getReceivingServer(controller);
            this.originalSettings.server = currentServerConfig;
            
            this.log(`Current server configuration:`, 'success');
            this.log(`  Server IP: ${currentServerConfig.serverIp}`, 'info');
            this.log(`  Port: ${currentServerConfig.port}`, 'info');
            this.log(`  Upload interval: ${currentServerConfig.uploadInterval}s`, 'info');
            this.log(`  Upload enabled: ${currentServerConfig.uploadEnabled}`, 'info');
            
            this.addResult('get_server', true, 'Server config retrieved', currentServerConfig);
        } catch (error) {
            this.addResult('get_server', false, `Get server config failed: ${error.message}`);
            this.log(`Get server config failed: ${error.message}`, 'error');
            return;
        }

        // Set the same server configuration (for testing)
        try {
            this.log('Setting server configuration (same values for testing)...', 'info');
            const testConfig = {
                serverIp: this.originalSettings.server.serverIp,
                port: this.originalSettings.server.port,
                uploadInterval: this.originalSettings.server.uploadInterval
            };
            
            this.log(`Setting: ${testConfig.serverIp}:${testConfig.port}, interval: ${testConfig.uploadInterval}s`, 'info');
            const setServerResult = await this.api.setReceivingServer(controller, testConfig);
            
            this.log(`Server configuration set successfully (same values)`, 'success');
            this.addResult('set_server', true, 'Server config set successfully', setServerResult);
        } catch (error) {
            this.addResult('set_server', false, `Set server config failed: ${error.message}`);
            this.log(`Set server config failed: ${error.message}`, 'error');
        }
    }

    async restoreOriginalSettings(controller) {
        this.log('Restoring original settings...', 'test');

        // Restore original time if we have it
        if (this.originalSettings.time) {
            try {
                this.log('Restoring original controller time...', 'info');
                await this.api.setControllerTime(controller, this.originalSettings.time);
                this.log('Original time restored', 'success');
            } catch (error) {
                this.log(`Failed to restore original time: ${error.message}`, 'warning');
            }
        }

        // Restore original server settings if we have them
        if (this.originalSettings.server) {
            try {
                this.log('Restoring original server configuration...', 'info');
                const originalConfig = {
                    serverIp: this.originalSettings.server.serverIp,
                    port: this.originalSettings.server.port,
                    uploadInterval: this.originalSettings.server.uploadInterval
                };
                
                await this.api.setReceivingServer(controller, originalConfig);
                this.log('Original server configuration restored', 'success');
            } catch (error) {
                this.log(`Failed to restore original server config: ${error.message}`, 'warning');
            }
        }
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('TEST SUMMARY', 'info');
        this.log('='.repeat(60), 'info');

        const passed = this.testResults.filter(r => r.success === true).length;
        const failed = this.testResults.filter(r => r.success === false).length;

        this.log(`Total tests: ${this.testResults.length}`, 'info');
        this.log(`Passed: ${passed}`, 'success');
        this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');

        this.log('\nDetailed Results:', 'info');
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            this.log(`${status} ${result.test}: ${result.message}`, 'info');
        });

        if (this.originalSettings.server) {
            this.log('\nOriginal Settings (Restored):', 'info');
            this.log(`Server IP: ${this.originalSettings.server.serverIp}`, 'info');
            this.log(`Port: ${this.originalSettings.server.port}`, 'info');
            this.log(`Upload Interval: ${this.originalSettings.server.uploadInterval}s`, 'info');
        }
    }

    async runTests() {
        this.log('Starting Controller Test Suite...', 'info');
        this.log('Cross-platform testing with safe get-then-set approach', 'info');
        this.log('', 'info');

        // Test discovery
        const controller = await this.testDiscovery();
        if (!controller) {
            this.log('Cannot proceed without controller discovery', 'error');
            return;
        }

        this.log('', 'info');

        // Test time operations
        await this.testTimeOperations(controller);
        this.log('', 'info');

        // Test server operations
        await this.testServerOperations(controller);
        this.log('', 'info');

        // Restore original settings
        await this.restoreOriginalSettings(controller);
        this.log('', 'info');

        this.printSummary();

        // Save results to logs directory
        const fs = require('fs');
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const resultsFile = path.join(logsDir, `test_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(resultsFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            controller: controller ? {
                serialNumber: controller.serialNumber,
                ip: controller.ip,
                remoteAddress: controller.remoteAddress,
                macAddress: controller.macAddress,
                driverVersion: controller.driverVersion
            } : null,
            originalSettings: this.originalSettings,
            testResults: this.testResults,
            summary: { 
                total: this.testResults.length, 
                passed: this.testResults.filter(r => r.success === true).length,
                failed: this.testResults.filter(r => r.success === false).length
            }
        }, null, 2));

        this.log(`Results saved to: ${resultsFile}`, 'info');
    }
}

// Main execution
async function main() {
    const tester = new ControllerTest();
    await tester.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ControllerTest;
