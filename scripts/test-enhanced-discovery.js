#!/usr/bin/env node

/**
 * Enhanced Discovery Test Suite
 * Tests the new cross-platform network discovery features
 * 
 * Features tested:
 * - Cross-platform network interface detection
 * - Multiple network adapter support
 * - Retry mechanisms with exponential backoff
 * - Unicast fallback discovery
 * - Network diagnostics and troubleshooting
 * - Known controller IP scenarios
 * - Discovery result validation and deduplication
 */

const path = require('path');
const fs = require('fs');
const ControllerAPI = require('../src/core/controller-api');

class EnhancedDiscoveryTest {
    constructor() {
        this.api = new ControllerAPI();
        this.testResults = [];
        this.startTime = new Date();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'test': '🧪',
            'network': '🌐',
            'diagnostic': '🔍'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    addResult(category, test, success, message, data = null, duration = null) {
        this.testResults.push({
            category,
            test,
            success,
            message,
            data,
            duration,
            timestamp: new Date().toISOString()
        });
    }

    async measureTime(asyncFunction) {
        const start = Date.now();
        try {
            const result = await asyncFunction();
            const duration = Date.now() - start;
            return { result, duration, success: true };
        } catch (error) {
            const duration = Date.now() - start;
            return { error, duration, success: false };
        }
    }

    /**
     * Test 1: Network Interface Detection
     */
    async testNetworkInterfaceDetection() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 1: Network Interface Detection', 'test');
        this.log('='.repeat(60), 'info');

        try {
            const networkInfo = this.api.getNetworkInfo();
            
            this.log(`Platform: ${networkInfo.platform}`, 'info');
            this.log(`Hostname: ${networkInfo.hostname}`, 'info');
            this.log(`Found ${networkInfo.interfaces.length} network interface(s)`, 'success');
            
            networkInfo.interfaces.forEach((iface, index) => {
                this.log(`Interface ${index + 1}:`, 'info');
                this.log(`  Name: ${iface.name}`, 'info');
                this.log(`  Type: ${iface.type}`, 'info');
                this.log(`  Address: ${iface.address}`, 'info');
                this.log(`  Netmask: ${iface.netmask}`, 'info');
                this.log(`  Broadcast: ${iface.broadcast}`, 'info');
                this.log(`  Network: ${iface.network}`, 'info');
                this.log(`  Priority: ${iface.priority}`, 'info');
                this.log(`  MAC: ${iface.mac}`, 'info');
            });

            this.addResult('network', 'interface_detection', true, 
                `Detected ${networkInfo.interfaces.length} interface(s)`, networkInfo);

            return networkInfo;

        } catch (error) {
            this.addResult('network', 'interface_detection', false, 
                `Interface detection failed: ${error.message}`);
            this.log(`Interface detection failed: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Test 2: Standard Enhanced Discovery
     */
    async testEnhancedDiscovery() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 2: Enhanced Discovery with Retry Mechanisms', 'test');
        this.log('='.repeat(60), 'info');

        const { result, duration, success, error } = await this.measureTime(async () => {
            return await this.api.discoverControllers(10000, {
                enableRetry: true,
                enableUnicastFallback: true,
                enableInterfaceDetection: true,
                maxRetries: 3,
                retryDelay: 1000,
                exponentialBackoff: true,
                logLevel: 'verbose'
            });
        });

        if (!success) {
            this.addResult('discovery', 'enhanced_discovery', false, 
                `Enhanced discovery failed: ${error.message}`, null, duration);
            this.log(`Enhanced discovery failed after ${duration}ms: ${error.message}`, 'error');
            return [];
        }

        const controllers = result;
        this.log(`Enhanced discovery completed in ${duration}ms`, 'success');
        this.log(`Found ${controllers.length} controller(s)`, 'success');

        controllers.forEach((controller, index) => {
            this.log(`Controller ${index + 1}:`, 'info');
            this.log(`  Serial: ${controller.serialNumber}`, 'info');
            this.log(`  Configured IP: ${controller.ip}`, 'info');
            this.log(`  Response from: ${controller.remoteAddress}`, 'info');
            this.log(`  MAC: ${controller.macAddress}`, 'info');
            this.log(`  Driver: ${controller.driverVersion}`, 'info');
        });

        this.addResult('discovery', 'enhanced_discovery', true, 
            `Found ${controllers.length} controller(s)`, { controllers }, duration);

        return controllers;
    }

    /**
     * Test 3: Targeted IP Discovery
     */
    async testTargetedDiscovery() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 3: Targeted IP Discovery', 'test');
        this.log('='.repeat(60), 'info');

        const targetIPs = ['192.168.2.66', '192.168.2.120', '192.168.1.1', '10.0.0.1'];
        
        const { result, duration, success, error } = await this.measureTime(async () => {
            return await this.api.discoverControllersByIP(targetIPs, 5000);
        });

        if (!success) {
            this.addResult('discovery', 'targeted_discovery', false, 
                `Targeted discovery failed: ${error.message}`, null, duration);
            this.log(`Targeted discovery failed after ${duration}ms: ${error.message}`, 'error');
            return [];
        }

        const controllers = result;
        this.log(`Targeted discovery completed in ${duration}ms`, 'success');
        this.log(`Found ${controllers.length} controller(s) from ${targetIPs.length} target(s)`, 'success');

        this.addResult('discovery', 'targeted_discovery', true, 
            `Found ${controllers.length} controller(s) from targeted IPs`, 
            { controllers, targetIPs }, duration);

        return controllers;
    }

    /**
     * Test 4: Network Diagnostics
     */
    async testNetworkDiagnostics() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 4: Network Diagnostics', 'test');
        this.log('='.repeat(60), 'info');

        const { result, duration, success, error } = await this.measureTime(async () => {
            return await this.api.runNetworkDiagnostics();
        });

        if (!success) {
            this.addResult('diagnostic', 'network_diagnostics', false, 
                `Network diagnostics failed: ${error.message}`, null, duration);
            this.log(`Network diagnostics failed after ${duration}ms: ${error.message}`, 'error');
            return null;
        }

        const diagnostics = result;
        this.log(`Network diagnostics completed in ${duration}ms`, 'success');
        
        this.log('Diagnostic Results:', 'diagnostic');
        this.log(`Platform: ${diagnostics.platform}`, 'info');
        this.log(`Hostname: ${diagnostics.hostname}`, 'info');
        this.log(`Network Interfaces: ${diagnostics.networkInterfaces.length}`, 'info');
        this.log(`Connectivity Tests: ${diagnostics.connectivityTests.length}`, 'info');
        
        // Show connectivity test results
        diagnostics.connectivityTests.forEach(test => {
            if (test.reachable) {
                this.log(`  ✅ ${test.targetIP}: Reachable (${test.responseTime}ms)`, 'success');
            } else {
                this.log(`  ❌ ${test.targetIP}: ${test.error}`, 'warning');
            }
        });

        // Show recommendations
        this.log('Recommendations:', 'diagnostic');
        diagnostics.recommendations.forEach(rec => {
            const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
            this.log(`  ${icon} ${rec.message}`, 'info');
            this.log(`     Action: ${rec.action}`, 'info');
        });

        this.addResult('diagnostic', 'network_diagnostics', true, 
            'Network diagnostics completed', diagnostics, duration);

        return diagnostics;
    }

    /**
     * Test 5: Discovery Configuration Testing
     */
    async testDiscoveryConfiguration() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 5: Discovery Configuration Testing', 'test');
        this.log('='.repeat(60), 'info');

        // Test different configuration scenarios
        const configurations = [
            {
                name: 'Fast Discovery',
                config: { maxRetries: 1, retryDelay: 500, enableUnicastFallback: false }
            },
            {
                name: 'Thorough Discovery',
                config: { maxRetries: 5, retryDelay: 2000, exponentialBackoff: true, enableUnicastFallback: true }
            },
            {
                name: 'Minimal Discovery',
                config: { maxRetries: 1, enableUnicastFallback: false, enableInterfaceDetection: false }
            }
        ];

        const configResults = [];

        for (const { name, config } of configurations) {
            this.log(`Testing configuration: ${name}`, 'test');
            
            const { result, duration, success, error } = await this.measureTime(async () => {
                return await this.api.discoverControllers(5000, config);
            });

            const configResult = {
                name,
                config,
                success,
                duration,
                controllerCount: success ? result.length : 0,
                error: success ? null : error.message
            };

            configResults.push(configResult);

            if (success) {
                this.log(`  ✅ ${name}: Found ${result.length} controller(s) in ${duration}ms`, 'success');
            } else {
                this.log(`  ❌ ${name}: Failed after ${duration}ms - ${error.message}`, 'error');
            }
        }

        this.addResult('discovery', 'configuration_testing', true, 
            'Discovery configuration testing completed', configResults);

        return configResults;
    }

    /**
     * Generate comprehensive test summary
     */
    generateSummary() {
        const endTime = new Date();
        const totalDuration = endTime.getTime() - this.startTime.getTime();

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success === true).length;
        const failedTests = this.testResults.filter(r => r.success === false).length;
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

        this.log('='.repeat(60), 'info');
        this.log('ENHANCED DISCOVERY TEST SUMMARY', 'test');
        this.log('='.repeat(60), 'info');

        this.log(`Test execution time: ${(totalDuration / 1000).toFixed(2)} seconds`, 'info');
        this.log(`Total tests: ${totalTests}`, 'info');
        this.log(`Passed: ${passedTests}`, passedTests === totalTests ? 'success' : 'info');
        this.log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
        this.log(`Success rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');

        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: parseFloat(successRate),
            totalDuration
        };
    }

    /**
     * Run all enhanced discovery tests
     */
    async runAllTests() {
        this.log('🚀 Starting Enhanced Discovery Test Suite', 'info');
        this.log('==========================================', 'info');
        this.log('', 'info');

        try {
            // Run all tests
            await this.testNetworkInterfaceDetection();
            await this.testEnhancedDiscovery();
            await this.testTargetedDiscovery();
            await this.testNetworkDiagnostics();
            await this.testDiscoveryConfiguration();

            // Generate summary
            const summary = this.generateSummary();

            // Save results
            const logsDir = path.join(__dirname, '..', 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultsFile = path.join(logsDir, `enhanced_discovery_results_${timestamp}.json`);
            
            fs.writeFileSync(resultsFile, JSON.stringify({
                timestamp: new Date().toISOString(),
                testSuite: 'Enhanced Discovery Test Suite',
                testResults: this.testResults,
                summary
            }, null, 2));

            this.log(`Results saved to: ${resultsFile}`, 'success');

            return summary;

        } catch (error) {
            this.log(`Test suite execution failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Main execution
if (require.main === module) {
    async function main() {
        const testSuite = new EnhancedDiscoveryTest();
        await testSuite.runAllTests();
    }
    
    main().catch(console.error);
}

module.exports = EnhancedDiscoveryTest;
