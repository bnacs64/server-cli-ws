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

        // Version command
        this.program
            .command('version')
            .description('Show version information')
            .action(() => {
                console.log('Controller Management System v1.0.0');
                console.log('Built for managing network-enabled hardware controllers');
                console.log('Supports UDP communication on port 60000 with 64-byte packet format');
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
                console.log('  version          Show version information');
                console.log('  help             Show this help message');
                console.log('');
                console.log('CLI MODE EXAMPLES:');
                console.log('  node app.js                           # Start interactive CLI');
                console.log('  node app.js cli discover              # Discover controllers');
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
