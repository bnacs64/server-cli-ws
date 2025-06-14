// Example: Using the REST API with HTTP requests
// This demonstrates how to interact with the Controller Management System via HTTP

const http = require('http');

class ControllerAPIClient {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }

    // Helper method to make HTTP requests
    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${response.error || response.message}`));
                        }
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${body}`));
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Discover controllers
    async discover(timeout = 5000) {
        return await this.makeRequest('POST', '/api/discover', { timeout });
    }

    // Get all controllers
    async getControllers() {
        return await this.makeRequest('GET', '/api/controllers');
    }

    // Get specific controller
    async getController(id) {
        return await this.makeRequest('GET', `/api/controllers/${id}`);
    }

    // Get controller time
    async getControllerTime(id) {
        return await this.makeRequest('GET', `/api/controllers/${id}/time`);
    }

    // Set controller time
    async setControllerTime(id, time = null) {
        const data = time ? { time: time.toISOString() } : {};
        return await this.makeRequest('POST', `/api/controllers/${id}/time`, data);
    }

    // Set controller network configuration
    async setControllerNetwork(id, config) {
        return await this.makeRequest('POST', `/api/controllers/${id}/network`, config);
    }

    // Get server configuration
    async getServerConfig(id) {
        return await this.makeRequest('GET', `/api/controllers/${id}/server`);
    }

    // Set server configuration
    async setServerConfig(id, config) {
        return await this.makeRequest('POST', `/api/controllers/${id}/server`, config);
    }

    // Health check
    async healthCheck() {
        return await this.makeRequest('GET', '/health');
    }
}

// Example usage
async function example() {
    console.log('🌐 Controller API Client Example');
    console.log('================================\n');

    const client = new ControllerAPIClient();

    try {
        // 1. Health check
        console.log('1. Checking server health...');
        const health = await client.healthCheck();
        console.log('✅ Server is healthy:', health.status);
        console.log();

        // 2. Discover controllers
        console.log('2. Discovering controllers...');
        const discovery = await client.discover(5000);
        console.log(`✅ Discovered ${discovery.controllers.length} controller(s)`);
        
        if (discovery.controllers.length > 0) {
            console.log('Controllers found:');
            discovery.controllers.forEach(controller => {
                console.log(`  - ${controller.serialNumber}: ${controller.ip} (${controller.macAddress})`);
            });
        }
        console.log();

        // 3. List all controllers
        console.log('3. Listing saved controllers...');
        const controllers = await client.getControllers();
        console.log(`✅ Found ${controllers.controllers.length} saved controller(s)`);
        console.log();

        // 4. Work with first controller if available
        if (controllers.controllers.length > 0) {
            const controller = controllers.controllers[0];
            const controllerId = controller.serialNumber;

            console.log(`4. Working with controller ${controllerId}...`);

            // Get controller details
            const details = await client.getController(controllerId);
            console.log('✅ Controller details:', {
                serial: details.controller.serialNumber,
                ip: details.controller.ip,
                version: details.controller.driverVersion
            });

            // Get current time
            try {
                const timeResult = await client.getControllerTime(controllerId);
                console.log('✅ Controller time:', new Date(timeResult.time).toLocaleString());
            } catch (error) {
                console.log('⚠️  Could not get controller time:', error.message);
            }

            // Set time to current system time
            try {
                const setTimeResult = await client.setControllerTime(controllerId, new Date());
                console.log('✅ Time set successfully');
            } catch (error) {
                console.log('⚠️  Could not set controller time:', error.message);
            }

            // Get server configuration
            try {
                const serverConfig = await client.getServerConfig(controllerId);
                console.log('✅ Server config:', {
                    ip: serverConfig.serverIp,
                    port: serverConfig.port,
                    uploadEnabled: serverConfig.uploadEnabled
                });
            } catch (error) {
                console.log('⚠️  Could not get server config:', error.message);
            }

            console.log();
        }

        console.log('🎉 API client example completed successfully!');

    } catch (error) {
        console.error('❌ Example failed:', error.message);
        console.log('\n💡 Make sure the server is running:');
        console.log('   node app.js server');
    }
}

// Run example if this file is executed directly
if (require.main === module) {
    example();
}

module.exports = { ControllerAPIClient, example };
