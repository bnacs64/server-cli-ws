// Example: WebSocket client for real-time controller management
// This demonstrates how to use WebSocket for live communication

const WebSocket = require('ws');

class ControllerWebSocketClient {
    constructor(url = 'ws://localhost:3000') {
        this.url = url;
        this.ws = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
    }

    // Connect to WebSocket server
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                console.log('🔌 Connected to WebSocket server');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });
        });
    }

    // Handle incoming messages
    handleMessage(message) {
        const { type, requestId } = message;

        // Handle responses to specific requests
        if (requestId && this.pendingRequests.has(requestId)) {
            const { resolve, reject } = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);

            if (message.success !== false && type !== 'error') {
                resolve(message);
            } else {
                reject(new Error(message.error || message.details || 'Request failed'));
            }
            return;
        }

        // Handle broadcast messages
        switch (type) {
            case 'welcome':
                console.log('👋 Server welcome:', message.message);
                break;

            case 'discovery_started':
                console.log('🔍 Discovery started...');
                break;

            case 'discovery_complete':
                console.log(`✅ Discovery complete: ${message.count} controller(s) found`);
                break;

            case 'discovery_error':
                console.log('❌ Discovery failed:', message.error);
                break;

            case 'command_executed':
                console.log(`📡 Command executed: ${message.command} on controller ${message.controllerId}`);
                break;

            case 'pong':
                console.log('🏓 Pong received');
                break;

            default:
                console.log('📨 Received message:', message);
        }
    }

    // Send a message and wait for response
    async sendRequest(type, data = {}, command = null) {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const requestId = `req_${++this.requestId}`;
            this.pendingRequests.set(requestId, { resolve, reject });

            const message = {
                type,
                requestId,
                data
            };

            if (command) {
                message.command = command;
            }

            this.ws.send(JSON.stringify(message));

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    // Discover controllers
    async discover(timeout = 5000) {
        return await this.sendRequest('discover', { timeout });
    }

    // Execute controller command
    async executeCommand(command, controllerId, data = {}) {
        return await this.sendRequest('command', { controllerId, ...data }, command);
    }

    // Subscribe to events
    async subscribe(events = ['all']) {
        return await this.sendRequest('subscribe', { events });
    }

    // Ping server
    async ping() {
        return await this.sendRequest('ping');
    }

    // Close connection
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Example usage
async function example() {
    console.log('🔌 WebSocket Client Example');
    console.log('===========================\n');

    const client = new ControllerWebSocketClient();

    try {
        // 1. Connect to server
        console.log('1. Connecting to WebSocket server...');
        await client.connect();
        console.log();

        // 2. Subscribe to events
        console.log('2. Subscribing to events...');
        await client.subscribe(['discovery_complete', 'command_executed']);
        console.log('✅ Subscribed to events');
        console.log();

        // 3. Ping server
        console.log('3. Pinging server...');
        await client.ping();
        console.log('✅ Ping successful');
        console.log();

        // 4. Discover controllers
        console.log('4. Discovering controllers...');
        const discovery = await client.discover(5000);
        console.log(`✅ Discovery completed: ${discovery.count} controller(s) found`);
        
        if (discovery.controllers && discovery.controllers.length > 0) {
            console.log('Controllers:');
            discovery.controllers.forEach(controller => {
                console.log(`  - ${controller.serialNumber}: ${controller.ip}`);
            });
        }
        console.log();

        // 5. Get all controllers
        console.log('5. Getting all controllers...');
        const controllers = await client.executeCommand('getControllers');
        console.log(`✅ Found ${controllers.result.controllers.length} saved controller(s)`);
        console.log();

        // 6. Work with first controller if available
        if (controllers.result.controllers.length > 0) {
            const controller = controllers.result.controllers[0];
            const controllerId = controller.serialNumber.toString();

            console.log(`6. Working with controller ${controllerId}...`);

            // Get time
            try {
                const timeResult = await client.executeCommand('getTime', controllerId);
                console.log('✅ Controller time:', new Date(timeResult.result.time).toLocaleString());
            } catch (error) {
                console.log('⚠️  Could not get time:', error.message);
            }

            // Set time
            try {
                const setTimeResult = await client.executeCommand('setTime', controllerId, {
                    time: new Date().toISOString()
                });
                console.log('✅ Time set successfully');
            } catch (error) {
                console.log('⚠️  Could not set time:', error.message);
            }

            // Get server config
            try {
                const serverResult = await client.executeCommand('getServer', controllerId);
                console.log('✅ Server config retrieved');
            } catch (error) {
                console.log('⚠️  Could not get server config:', error.message);
            }

            // Get network config
            try {
                const networkResult = await client.executeCommand('getNetwork', controllerId);
                console.log('✅ Network config retrieved:', {
                    ip: networkResult.ip,
                    subnetMask: networkResult.subnetMask,
                    gateway: networkResult.gateway
                });
            } catch (error) {
                console.log('⚠️  Could not get network config:', error.message);
            }

            console.log();
        }

        console.log('🎉 WebSocket example completed successfully!');
        
        // Keep connection open for a bit to see any broadcast messages
        console.log('\n⏳ Keeping connection open for 5 seconds to monitor events...');
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
        console.error('❌ Example failed:', error.message);
        console.log('\n💡 Make sure the server is running:');
        console.log('   node app.js server');
    } finally {
        client.close();
    }
}

// Run example if this file is executed directly
if (require.main === module) {
    example();
}

module.exports = { ControllerWebSocketClient, example };
