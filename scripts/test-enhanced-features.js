#!/usr/bin/env node

/**
 * Enhanced Features Test Script
 * Demonstrates all enhanced discovery and network diagnostic features
 * 
 * This script showcases:
 * - Cross-platform network interface detection
 * - Enhanced discovery with retry mechanisms
 * - Targeted IP discovery
 * - Network diagnostics and troubleshooting
 * - Configuration testing
 */

const ControllerAPI = require('../src/core/controller-api');

class EnhancedFeaturesTest {
    constructor() {
        this.api = new ControllerAPI();
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

    /**
     * Test 1: Network Interface Detection
     */
    async testNetworkInterfaces() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 1: Cross-Platform Network Interface Detection', 'test');
        this.log('='.repeat(60), 'info');

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

        return networkInfo;
    }

    /**
     * Test 2: Enhanced Discovery with Different Configurations
     */
    async testEnhancedDiscovery() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 2: Enhanced Discovery with Different Configurations', 'test');
        this.log('='.repeat(60), 'info');

        const configurations = [
            {
                name: 'Standard Enhanced Discovery',
                options: {
                    enableRetry: true,
                    enableUnicastFallback: true,
                    enableInterfaceDetection: true,
                    maxRetries: 3,
                    retryDelay: 1000,
                    exponentialBackoff: true,
                    logLevel: 'info'
                }
            },
            {
                name: 'Fast Discovery (Minimal Retries)',
                options: {
                    enableRetry: true,
                    enableUnicastFallback: false,
                    enableInterfaceDetection: true,
                    maxRetries: 1,
                    retryDelay: 500,
                    exponentialBackoff: false,
                    logLevel: 'info'
                }
            },
            {
                name: 'Thorough Discovery (Maximum Retries)',
                options: {
                    enableRetry: true,
                    enableUnicastFallback: true,
                    enableInterfaceDetection: true,
                    maxRetries: 5,
                    retryDelay: 2000,
                    exponentialBackoff: true,
                    logLevel: 'verbose'
                }
            }
        ];

        const results = [];

        for (const config of configurations) {
            this.log(`Testing: ${config.name}`, 'test');
            
            const startTime = Date.now();
            try {
                const controllers = await this.api.discoverControllers(8000, config.options);
                const duration = Date.now() - startTime;
                
                this.log(`✅ ${config.name}: Found ${controllers.length} controller(s) in ${duration}ms`, 'success');
                
                results.push({
                    name: config.name,
                    success: true,
                    controllerCount: controllers.length,
                    duration,
                    controllers
                });
                
            } catch (error) {
                const duration = Date.now() - startTime;
                this.log(`❌ ${config.name}: Failed after ${duration}ms - ${error.message}`, 'error');
                
                results.push({
                    name: config.name,
                    success: false,
                    controllerCount: 0,
                    duration,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Test 3: Targeted IP Discovery
     */
    async testTargetedDiscovery() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 3: Targeted IP Discovery', 'test');
        this.log('='.repeat(60), 'info');

        const targetIPs = [
            '192.168.2.66',   // Known controller IP
            '192.168.2.120',  // Known response IP
            '192.168.1.1',    // Common gateway
            '10.0.0.1',       // Another common gateway
            '172.16.0.1'      // Enterprise network gateway
        ];

        this.log(`Testing targeted discovery to ${targetIPs.length} IP addresses`, 'info');
        this.log(`Target IPs: ${targetIPs.join(', ')}`, 'info');

        const startTime = Date.now();
        try {
            const controllers = await this.api.discoverControllersByIP(targetIPs, 5000);
            const duration = Date.now() - startTime;
            
            this.log(`✅ Targeted discovery completed in ${duration}ms`, 'success');
            this.log(`Found ${controllers.length} controller(s) from targeted IPs`, 'success');
            
            controllers.forEach((controller, index) => {
                this.log(`Controller ${index + 1}:`, 'info');
                this.log(`  Serial: ${controller.serialNumber}`, 'info');
                this.log(`  Configured IP: ${controller.ip}`, 'info');
                this.log(`  Response from: ${controller.remoteAddress}`, 'info');
            });

            return { success: true, controllers, duration };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log(`❌ Targeted discovery failed after ${duration}ms: ${error.message}`, 'error');
            return { success: false, error: error.message, duration };
        }
    }

    /**
     * Test 4: Network Diagnostics
     */
    async testNetworkDiagnostics() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 4: Network Diagnostics and Troubleshooting', 'test');
        this.log('='.repeat(60), 'info');

        try {
            const diagnostics = await this.api.runNetworkDiagnostics();
            
            this.log('Network diagnostic results:', 'diagnostic');
            this.log(`Platform: ${diagnostics.platform}`, 'info');
            this.log(`Hostname: ${diagnostics.hostname}`, 'info');
            this.log(`Network interfaces: ${diagnostics.networkInterfaces.length}`, 'info');
            this.log(`Connectivity tests: ${diagnostics.connectivityTests.length}`, 'info');
            
            this.log('Connectivity test results:', 'diagnostic');
            diagnostics.connectivityTests.forEach(test => {
                if (test.reachable) {
                    this.log(`  ✅ ${test.targetIP}: Reachable (${test.responseTime}ms)`, 'success');
                } else {
                    this.log(`  ❌ ${test.targetIP}: ${test.error}`, 'warning');
                }
            });
            
            this.log('Network recommendations:', 'diagnostic');
            diagnostics.recommendations.forEach(rec => {
                const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                this.log(`  ${icon} ${rec.message}`, 'info');
                this.log(`     Action: ${rec.action}`, 'info');
            });

            return diagnostics;
            
        } catch (error) {
            this.log(`❌ Network diagnostics failed: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Test 5: Discovery Configuration Testing
     */
    async testDiscoveryConfiguration() {
        this.log('='.repeat(60), 'info');
        this.log('TEST 5: Discovery Configuration Testing', 'test');
        this.log('='.repeat(60), 'info');

        // Test different configuration scenarios
        const testConfigs = [
            { maxRetries: 1, retryDelay: 500, enableUnicastFallback: false },
            { maxRetries: 3, retryDelay: 1000, enableUnicastFallback: true },
            { maxRetries: 5, retryDelay: 2000, exponentialBackoff: true }
        ];

        this.log('Testing discovery configuration changes...', 'info');

        for (const config of testConfigs) {
            this.log(`Setting config: retries=${config.maxRetries}, delay=${config.retryDelay}ms`, 'info');
            
            // Apply configuration
            this.api.setDiscoveryConfig(config);
            
            // Verify configuration was applied
            const currentConfig = this.api.packetHandler.getDiscoveryConfig();
            this.log(`Applied config: ${JSON.stringify(currentConfig)}`, 'info');
        }

        this.log('✅ Discovery configuration testing completed', 'success');
        return true;
    }

    /**
     * Run all enhanced feature tests
     */
    async runAllTests() {
        this.log('🚀 Starting Enhanced Features Test Suite', 'info');
        this.log('=========================================', 'info');
        this.log('', 'info');

        try {
            // Test 1: Network Interface Detection
            const networkInfo = await this.testNetworkInterfaces();
            console.log('');

            // Test 2: Enhanced Discovery
            const discoveryResults = await this.testEnhancedDiscovery();
            console.log('');

            // Test 3: Targeted Discovery
            const targetedResults = await this.testTargetedDiscovery();
            console.log('');

            // Test 4: Network Diagnostics
            const diagnostics = await this.testNetworkDiagnostics();
            console.log('');

            // Test 5: Configuration Testing
            const configResults = await this.testDiscoveryConfiguration();
            console.log('');

            // Summary
            this.log('='.repeat(60), 'info');
            this.log('ENHANCED FEATURES TEST SUMMARY', 'test');
            this.log('='.repeat(60), 'info');

            this.log(`✅ Network Interface Detection: ${networkInfo.interfaces.length} interfaces found`, 'success');
            this.log(`✅ Enhanced Discovery: ${discoveryResults.length} configurations tested`, 'success');
            this.log(`✅ Targeted Discovery: ${targetedResults.success ? 'Completed' : 'Failed'}`, targetedResults.success ? 'success' : 'warning');
            this.log(`✅ Network Diagnostics: ${diagnostics ? 'Completed' : 'Failed'}`, diagnostics ? 'success' : 'warning');
            this.log(`✅ Configuration Testing: ${configResults ? 'Completed' : 'Failed'}`, configResults ? 'success' : 'warning');

            this.log('', 'info');
            this.log('🎉 Enhanced features test suite completed!', 'success');
            this.log('', 'info');
            this.log('📋 Key Features Demonstrated:', 'info');
            this.log('  • Cross-platform network interface detection', 'info');
            this.log('  • Enhanced discovery with retry mechanisms', 'info');
            this.log('  • Targeted IP discovery capabilities', 'info');
            this.log('  • Comprehensive network diagnostics', 'info');
            this.log('  • Configurable discovery parameters', 'info');
            this.log('  • Enterprise network compatibility', 'info');

        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Main execution
if (require.main === module) {
    async function main() {
        const testSuite = new EnhancedFeaturesTest();
        await testSuite.runAllTests();
    }
    
    main().catch(console.error);
}

module.exports = EnhancedFeaturesTest;
