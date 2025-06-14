#!/usr/bin/env node

const { Command } = require('commander');
const CLI = require('./src/cli');
const Server = require('./src/server');

/**
 * Main Application Entry Point
 * Handles both CLI and Server modes based on command line arguments
 */
class Application {
    constructor() {
        this.program = new Command();
        this.setupCommands();
    }

    setupCommands() {
        this.program
            .name('controller-management-system')
            .description('Network-enabled hardware controller management system')
            .version('1.0.0');

        // CLI mode (default)
        this.program
            .command('cli', { isDefault: true })
            .description('Run in CLI mode')
            .allowUnknownOption()
            .action(async () => {
                await this.runCLI();
            });

        // Server mode
        this.program
            .command('server')
            .description('Run in server mode')
            .option('-p, --port <port>', 'Server port', '3000')
            .option('-h, --host <host>', 'Server host', 'localhost')
            .action(async (options) => {
                await this.runServer(options);
            });

        // Enhanced discovery command (direct access)
        this.program
            .command('discover')
            .description('Discover controllers with enhanced cross-platform support')
            .option('-t, --timeout <seconds>', 'Discovery timeout in seconds', '5')
            .option('-r, --retries <count>', 'Maximum retry attempts', '3')
            .option('-d, --delay <ms>', 'Retry delay in milliseconds', '1000')
            .option('--no-unicast', 'Disable unicast fallback discovery')
            .option('--no-interfaces', 'Disable network interface detection')
            .option('-v, --verbose', 'Enable verbose logging')
            .option('--target <ip>', 'Target specific IP address(es) (comma-separated)')
            .action(async (options) => {
                await this.runEnhancedDiscovery(options);
            });

        // Network diagnostics command (direct access)
        this.program
            .command('diagnose')
            .description('Run network diagnostics for troubleshooting discovery issues')
            .option('-v, --verbose', 'Enable verbose output')
            .action(async (options) => {
                await this.runNetworkDiagnostics(options);
            });

        // Version command
        this.program
            .command('version')
            .description('Show version information')
            .action(() => {
                console.log('Controller Management System v1.0.0 - Enhanced Discovery Edition');
                console.log('Built for managing network-enabled hardware controllers');
                console.log('Supports UDP communication on port 60000 with 64-byte packet format');
                console.log('Features: Cross-platform discovery, retry mechanisms, network diagnostics');
            });

        // Help command
        this.program
            .command('help')
            .description('Show help information')
            .action(() => {
                console.log('Controller Management System - Help');
                console.log('');
                console.log('USAGE:');
                console.log('  node app.js [command] [options]');
                console.log('');
                console.log('COMMANDS:');
                console.log('  cli (default)    Run in CLI mode for interactive management');
                console.log('  server           Run in server mode (REST API + WebSocket)');
                console.log('  discover         Enhanced controller discovery (direct access)');
                console.log('  diagnose         Network diagnostics and troubleshooting');
                console.log('  version          Show version information');
                console.log('  help             Show this help message');
                console.log('');
                console.log('ENHANCED DISCOVERY EXAMPLES:');
                console.log('  node app.js discover                  # Enhanced discovery with defaults');
                console.log('  node app.js discover --verbose        # Verbose discovery with interface info');
                console.log('  node app.js discover --retries 5      # Discovery with 5 retry attempts');
                console.log('  node app.js discover --target 192.168.2.66  # Target specific IP');
                console.log('  node app.js diagnose                  # Network diagnostics');
                console.log('  node app.js diagnose --verbose        # Detailed network analysis');
                console.log('');
                console.log('CLI MODE EXAMPLES:');
                console.log('  node app.js                           # Start interactive CLI');
                console.log('  node app.js cli discover              # Discover controllers (CLI mode)');
                console.log('  node app.js cli list                  # List saved controllers');
                console.log('  node app.js cli get time -c 12345     # Get time from controller');
                console.log('  node app.js cli set time -c 12345     # Set time on controller');
                console.log('  node app.js cli interactive           # Interactive mode');
                console.log('');
                console.log('SERVER MODE EXAMPLES:');
                console.log('  node app.js server                    # Start server on port 3000');
                console.log('  node app.js server -p 8080            # Start server on port 8080');
                console.log('');
                console.log('SERVER ENDPOINTS:');
                console.log('  GET  /                                # Server info');
                console.log('  GET  /health                          # Health check');
                console.log('  GET  /docs                            # API documentation');
                console.log('  POST /api/discover                    # Discover controllers');
                console.log('  GET  /api/controllers                 # List controllers');
                console.log('  GET  /api/controllers/:id/time        # Get controller time');
                console.log('  POST /api/controllers/:id/time        # Set controller time');
                console.log('  WebSocket: ws://localhost:3000        # Real-time communication');
                console.log('');
                console.log('For more information, visit: https://github.com/your-repo');
            });
    }

    async runCLI() {
        try {
            const cli = new CLI();
            
            // If no additional arguments, run interactive mode
            if (process.argv.length <= 3) {
                console.log('🎛️  Controller Management System - CLI Mode');
                console.log('Starting interactive mode...\n');
                await cli.handleInteractive();
            } else {
                // Pass remaining arguments to CLI
                const cliArgs = process.argv.slice(2);
                // Remove 'cli' from args if present
                if (cliArgs[0] === 'cli') {
                    cliArgs.shift();
                }
                await cli.run(['node', 'cli', ...cliArgs]);
            }
        } catch (error) {
            console.error('❌ CLI Error:', error.message);
            process.exit(1);
        }
    }

    async runEnhancedDiscovery(options) {
        try {
            const ControllerAPI = require('./src/core/controller-api');
            const api = new ControllerAPI();

            const timeout = parseInt(options.timeout) * 1000;
            const maxRetries = parseInt(options.retries);
            const retryDelay = parseInt(options.delay);

            console.log('🔍 Enhanced Controller Discovery');
            console.log('================================');
            console.log(`Timeout: ${timeout/1000}s | Retries: ${maxRetries} | Delay: ${retryDelay}ms`);
            console.log('');

            if (options.target) {
                // Targeted discovery
                const targetIPs = options.target.split(',').map(ip => ip.trim());
                console.log(`🎯 Targeting specific IPs: ${targetIPs.join(', ')}`);

                const controllers = await api.discoverControllersByIP(targetIPs, timeout);

                if (controllers.length === 0) {
                    console.log('❌ No controllers found at target IPs');
                    console.log('💡 Try running "node app.js diagnose" for troubleshooting');
                    return;
                }

                console.log(`✅ Found ${controllers.length} controller(s):`);
                this.displayControllers(controllers, options.verbose);

            } else {
                // Enhanced discovery
                const discoveryOptions = {
                    enableRetry: true,
                    enableUnicastFallback: options.unicast !== false,
                    enableInterfaceDetection: options.interfaces !== false,
                    maxRetries,
                    retryDelay,
                    exponentialBackoff: true,
                    logLevel: options.verbose ? 'verbose' : 'info'
                };

                if (options.verbose) {
                    const networkInfo = api.getNetworkInfo();
                    console.log(`Platform: ${networkInfo.platform}`);
                    console.log(`Found ${networkInfo.interfaces.length} network interface(s)`);
                    console.log('');
                }

                const controllers = await api.discoverControllers(timeout, discoveryOptions);

                if (controllers.length === 0) {
                    console.log('❌ No controllers found');
                    console.log('💡 Try running "node app.js diagnose" for troubleshooting');
                    return;
                }

                console.log(`✅ Found ${controllers.length} controller(s):`);
                this.displayControllers(controllers, options.verbose);
            }

        } catch (error) {
            console.error('❌ Enhanced discovery failed:', error.message);
            process.exit(1);
        }
    }

    async runNetworkDiagnostics(options) {
        try {
            const ControllerAPI = require('./src/core/controller-api');
            const api = new ControllerAPI();

            console.log('🔍 Network Diagnostics');
            console.log('======================');
            console.log('');

            const diagnostics = await api.runNetworkDiagnostics();

            console.log('📊 System Information:');
            console.log(`Platform: ${diagnostics.platform}`);
            console.log(`Hostname: ${diagnostics.hostname}`);
            console.log(`Timestamp: ${diagnostics.timestamp}`);
            console.log('');

            console.log(`🌐 Network Interfaces (${diagnostics.networkInterfaces.length}):`);
            diagnostics.networkInterfaces.forEach((iface, index) => {
                console.log(`  ${index + 1}. ${iface.name} (${iface.type})`);
                console.log(`     Address: ${iface.address}/${iface.netmask}`);
                console.log(`     Network: ${iface.network}`);
                console.log(`     Broadcast: ${iface.broadcast}`);
                console.log(`     Priority: ${iface.priority}`);
                if (options.verbose) {
                    console.log(`     MAC: ${iface.mac}`);
                }
            });
            console.log('');

            console.log(`🔗 Connectivity Tests (${diagnostics.connectivityTests.length}):`);
            diagnostics.connectivityTests.forEach(test => {
                if (test.reachable) {
                    console.log(`  ✅ ${test.targetIP}: Reachable (${test.responseTime}ms)`);
                } else {
                    console.log(`  ❌ ${test.targetIP}: ${test.error}`);
                }
            });
            console.log('');

            console.log(`💡 Recommendations (${diagnostics.recommendations.length}):`);
            diagnostics.recommendations.forEach(rec => {
                const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`  ${icon} ${rec.message}`);
                console.log(`     Action: ${rec.action}`);
            });

            if (options.verbose) {
                console.log('');
                console.log('⚙️ Discovery Configuration:');
                console.log(JSON.stringify(diagnostics.discoveryConfig, null, 2));
            }

        } catch (error) {
            console.error('❌ Network diagnostics failed:', error.message);
            process.exit(1);
        }
    }

    displayControllers(controllers, verbose = false) {
        controllers.forEach((controller, index) => {
            console.log(`\nController ${index + 1}:`);
            console.log(`  Serial Number: ${controller.serialNumber}`);
            console.log(`  Configured IP: ${controller.ip}`);
            console.log(`  Response from: ${controller.remoteAddress}`);
            console.log(`  MAC Address: ${controller.macAddress}`);
            console.log(`  Driver Version: ${controller.driverVersion}`);
            console.log(`  Release Date: ${controller.driverReleaseDate}`);

            // Show network behavior notes if verbose or different IPs
            if (verbose || controller.ip !== controller.remoteAddress) {
                console.log(`  ℹ️  Network Behavior: Controller responds from different IP`);
                console.log(`     This indicates NAT/routing behavior (normal in enterprise networks)`);
            }
        });
    }

    async runServer(options) {
        try {
            const port = parseInt(options.port) || 3000;
            const server = new Server(port);

            console.log('🚀 Starting Controller Management Server...');
            console.log(`📡 Mode: Server`);
            console.log(`🌐 Port: ${port}`);
            console.log('');

            await server.start();

            // Keep the process running
            process.on('SIGINT', async () => {
                console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

        } catch (error) {
            console.error('❌ Server Error:', error.message);
            process.exit(1);
        }
    }

    async run() {
        try {
            // If no arguments provided, show help
            if (process.argv.length <= 2) {
                console.log('🎛️  Controller Management System');
                console.log('');
                console.log('Choose a mode:');
                console.log('  CLI Mode:    node app.js cli');
                console.log('  Server Mode: node app.js server');
                console.log('  Help:        node app.js help');
                console.log('');
                console.log('Starting CLI mode by default...\n');
                await this.runCLI();
                return;
            }

            await this.program.parseAsync(process.argv);
        } catch (error) {
            console.error('❌ Application Error:', error.message);
            process.exit(1);
        }
    }
}

// Create and run the application
const app = new Application();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the application
if (require.main === module) {
    app.run().catch((error) => {
        console.error('❌ Fatal Error:', error.message);
        process.exit(1);
    });
}

module.exports = Application;
