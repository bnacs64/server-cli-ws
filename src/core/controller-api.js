const PacketHandler = require('./packet-handler');
const ConfigManager = require('./config-manager');

/**
 * Controller API - Main interface for controller operations
 * Implements all controller communication functions based on SDK specifications
 */
class ControllerAPI {
    constructor() {
        this.packetHandler = new PacketHandler();
        this.configManager = new ConfigManager();
        
        // Function IDs from SDK
        this.FUNCTION_IDS = {
            DISCOVER: 0x94,
            SET_IP: 0x96,
            QUERY_STATUS: 0x20,
            GET_TIME: 0x32,
            SET_TIME: 0x30,
            GET_RECORD: 0xB0,
            SET_RECORD_INDEX: 0xB2,
            GET_RECORD_INDEX: 0xB4,
            REMOTE_OPEN_DOOR: 0x40,
            ADD_PRIVILEGE: 0x50,
            DELETE_PRIVILEGE: 0x52,
            CLEAR_PRIVILEGES: 0x54,
            GET_PRIVILEGE_COUNT: 0x58,
            QUERY_PRIVILEGE: 0x5A,
            GET_PRIVILEGE_BY_INDEX: 0x5C,
            SET_DOOR_PARAMS: 0x80,
            GET_DOOR_PARAMS: 0x82,
            SET_RECEIVING_SERVER: 0x90,
            GET_RECEIVING_SERVER: 0x92,
            ADD_PRIVILEGE_BATCH: 0x56
        };
    }

    /**
     * Enhanced controller discovery with cross-platform network interface support
     * Function ID: 0x94
     */
    async discoverControllers(timeout = 5000, options = {}) {
        try {
            // Configure discovery options
            const discoveryOptions = {
                enableRetry: true,
                enableUnicastFallback: true,
                enableInterfaceDetection: true,
                maxRetries: 3,
                retryDelay: 1000,
                exponentialBackoff: true,
                logLevel: 'info',
                ...options
            };

            // Apply discovery configuration
            if (discoveryOptions.maxRetries !== undefined) {
                this.packetHandler.setDiscoveryConfig({
                    maxRetries: discoveryOptions.maxRetries,
                    retryDelay: discoveryOptions.retryDelay,
                    exponentialBackoff: discoveryOptions.exponentialBackoff,
                    enableUnicastFallback: discoveryOptions.enableUnicastFallback,
                    enableInterfaceDetection: discoveryOptions.enableInterfaceDetection
                });
            }

            if (discoveryOptions.logLevel === 'verbose') {
                console.log('Network interface information:', this.packetHandler.getNetworkInfo());
            }

            const packet = this.packetHandler.createPacket(this.FUNCTION_IDS.DISCOVER);
            const responses = await this.packetHandler.broadcastPacket(packet, timeout);

            const controllers = [];

            for (const { response, remoteInfo } of responses) {
                if (response.functionId === this.FUNCTION_IDS.DISCOVER) {
                    const controller = this.parseDiscoveryResponse(response, remoteInfo);

                    // Validate controller response
                    if (this.validateDiscoveryResponse(controller, remoteInfo)) {
                        controllers.push(controller);

                        // Save to config
                        await this.configManager.addController(controller);

                        if (discoveryOptions.logLevel === 'verbose') {
                            console.log(`Validated controller: ${controller.serialNumber} at ${controller.ip}`);
                        }
                    }
                }
            }

            return controllers;
        } catch (error) {
            throw new Error(`Discovery failed: ${error.message}`);
        }
    }

    /**
     * Discover controllers by targeting specific IP addresses
     * Useful when controller IP is known but serial number is not
     */
    async discoverControllersByIP(targetIPs, timeout = 5000) {
        try {
            const packet = this.packetHandler.createPacket(this.FUNCTION_IDS.DISCOVER);
            const controllers = [];

            // Ensure targetIPs is an array
            const targets = Array.isArray(targetIPs) ? targetIPs : [targetIPs];

            console.log(`Attempting targeted discovery to ${targets.length} IP address(es)`);

            // Try each target IP
            for (const targetIP of targets) {
                try {
                    console.log(`Discovering controller at ${targetIP}`);
                    const { response, remoteInfo } = await this.packetHandler.sendPacket(packet, targetIP, timeout);

                    if (response.functionId === this.FUNCTION_IDS.DISCOVER) {
                        const controller = this.parseDiscoveryResponse(response, remoteInfo);

                        if (this.validateDiscoveryResponse(controller, remoteInfo)) {
                            controllers.push(controller);
                            await this.configManager.addController(controller);
                            console.log(`Found controller: ${controller.serialNumber} at ${targetIP}`);
                        }
                    }
                } catch (error) {
                    console.debug(`No controller found at ${targetIP}: ${error.message}`);
                }
            }

            return controllers;
        } catch (error) {
            throw new Error(`Targeted discovery failed: ${error.message}`);
        }
    }

    /**
     * Validate discovery response for consistency and known behavior patterns
     */
    validateDiscoveryResponse(controller, remoteInfo) {
        // Basic validation
        if (!controller.serialNumber || controller.serialNumber === 0) {
            console.warn('Invalid controller: missing or zero serial number');
            return false;
        }

        if (!controller.ip || !this.isValidIP(controller.ip)) {
            console.warn(`Invalid controller: invalid IP address ${controller.ip}`);
            return false;
        }

        // Check for known controller behavior (responds from different IP)
        if (controller.ip !== remoteInfo.address) {
            console.log(`Controller behavior detected: configured IP ${controller.ip}, responds from ${remoteInfo.address}`);
            // This is expected behavior, not an error
        }

        // Validate MAC address format
        if (controller.macAddress && !this.isValidMAC(controller.macAddress)) {
            console.warn(`Invalid controller: invalid MAC address ${controller.macAddress}`);
            return false;
        }

        return true;
    }

    /**
     * Validate IP address format
     */
    isValidIP(ip) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) return false;

        const parts = ip.split('.').map(Number);
        return parts.every(part => part >= 0 && part <= 255);
    }

    /**
     * Validate MAC address format
     */
    isValidMAC(mac) {
        const macRegex = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
        return macRegex.test(mac);
    }

    /**
     * Comprehensive network diagnostics for troubleshooting discovery issues
     */
    async runNetworkDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            platform: require('os').platform(),
            hostname: require('os').hostname(),
            networkInterfaces: [],
            discoveryConfig: {},
            connectivityTests: [],
            recommendations: []
        };

        try {
            // Get network interface information
            diagnostics.networkInterfaces = this.packetHandler.getNetworkInterfaces();
            diagnostics.discoveryConfig = this.packetHandler.getDiscoveryConfig();

            console.log('Running network diagnostics...');
            console.log(`Platform: ${diagnostics.platform}`);
            console.log(`Found ${diagnostics.networkInterfaces.length} network interface(s)`);

            // Test connectivity to known controller IPs
            const knownIPs = ['192.168.2.66', '192.168.2.120'];
            for (const ip of knownIPs) {
                const connectivityTest = await this.testConnectivity(ip);
                diagnostics.connectivityTests.push(connectivityTest);
            }

            // Generate recommendations
            diagnostics.recommendations = this.generateNetworkRecommendations(diagnostics);

            return diagnostics;

        } catch (error) {
            diagnostics.error = error.message;
            return diagnostics;
        }
    }

    /**
     * Test connectivity to a specific IP address
     */
    async testConnectivity(targetIP, timeout = 3000) {
        const test = {
            targetIP,
            timestamp: new Date().toISOString(),
            reachable: false,
            responseTime: null,
            error: null
        };

        try {
            const startTime = Date.now();

            // Try to send a discovery packet to the specific IP
            const packet = this.packetHandler.createPacket(this.FUNCTION_IDS.DISCOVER);
            await this.packetHandler.sendPacket(packet, targetIP, timeout);

            test.reachable = true;
            test.responseTime = Date.now() - startTime;

        } catch (error) {
            test.error = error.message;
        }

        return test;
    }

    /**
     * Generate network recommendations based on diagnostics
     */
    generateNetworkRecommendations(diagnostics) {
        const recommendations = [];

        // Check for network interfaces
        if (diagnostics.networkInterfaces.length === 0) {
            recommendations.push({
                type: 'error',
                message: 'No network interfaces found',
                action: 'Check network adapter configuration and drivers'
            });
        }

        // Check for ethernet interfaces
        const ethernetInterfaces = diagnostics.networkInterfaces.filter(iface => iface.type === 'ethernet');
        if (ethernetInterfaces.length === 0) {
            recommendations.push({
                type: 'warning',
                message: 'No ethernet interfaces found',
                action: 'Controllers are typically connected via ethernet. Check ethernet adapter.'
            });
        }

        // Check for controller network (192.168.2.x)
        const controllerNetworkInterfaces = diagnostics.networkInterfaces.filter(iface =>
            iface.network && iface.network.startsWith('192.168.2.'));

        if (controllerNetworkInterfaces.length === 0) {
            recommendations.push({
                type: 'info',
                message: 'No interfaces on controller network (192.168.2.x)',
                action: 'Controller may be on different network. Check network configuration.'
            });
        }

        // Check connectivity test results
        const reachableTests = diagnostics.connectivityTests.filter(test => test.reachable);
        if (reachableTests.length === 0) {
            recommendations.push({
                type: 'warning',
                message: 'No controllers reachable on known IPs',
                action: 'Check controller power, network cables, and IP configuration'
            });
        }

        // Platform-specific recommendations
        if (diagnostics.platform === 'win32') {
            recommendations.push({
                type: 'info',
                message: 'Windows detected',
                action: 'Ensure Windows Firewall allows UDP port 60000'
            });
        } else if (diagnostics.platform === 'darwin') {
            recommendations.push({
                type: 'info',
                message: 'macOS detected',
                action: 'Check System Preferences > Security & Privacy > Firewall settings'
            });
        } else if (diagnostics.platform === 'linux') {
            recommendations.push({
                type: 'info',
                message: 'Linux detected',
                action: 'Check iptables/ufw firewall rules for UDP port 60000'
            });
        }

        return recommendations;
    }

    /**
     * Get network interface information for debugging
     */
    getNetworkInfo() {
        return this.packetHandler.getNetworkInfo();
    }

    /**
     * Configure discovery behavior
     */
    setDiscoveryConfig(config) {
        this.packetHandler.setDiscoveryConfig(config);
    }

    /**
     * Parse discovery response packet
     * Based on SDK specification lines 180-207
     */
    parseDiscoveryResponse(response, remoteInfo) {
        const data = response.data;

        // Extract IP address (bytes 0-3 of data) - SDK bytes 8-11
        const ip = this.packetHandler.bytesToIp([data[0], data[1], data[2], data[3]]);

        // Extract subnet mask (bytes 4-7 of data) - SDK bytes 12-15
        const subnetMask = this.packetHandler.bytesToIp([data[4], data[5], data[6], data[7]]);

        // Extract gateway (bytes 8-11 of data) - SDK bytes 16-19
        const gateway = this.packetHandler.bytesToIp([data[8], data[9], data[10], data[11]]);

        // Extract MAC address (bytes 12-17 of data) - SDK bytes 20-25
        const macAddress = data.slice(12, 18).map(b => b.toString(16).padStart(2, '0')).join(':');

        // Extract driver version (bytes 18-19 of data, BCD format) - SDK bytes 26-27
        // For version 6.26: stored as 0x06 0x26 (major.minor in BCD)
        const driverVersionMajor = this.packetHandler.bcdToDecimal(data[18]);  // Major version
        const driverVersionMinor = this.packetHandler.bcdToDecimal(data[19]); // Minor version
        const driverVersion = `${driverVersionMajor}.${driverVersionMinor}`;

        // Extract driver release date (bytes 20-23 of data, BCD format) - SDK bytes 28-31
        // Format: YYYYMMDD in BCD, e.g., 0x20 0x21 0x09 0x15 = 2021-09-15
        const yearHigh = this.packetHandler.bcdToDecimal(data[20]); // Year high (20)
        const yearLow = this.packetHandler.bcdToDecimal(data[21]);  // Year low (21)
        const month = this.packetHandler.bcdToDecimal(data[22]);    // Month (09)
        const day = this.packetHandler.bcdToDecimal(data[23]);      // Day (15)
        const year = yearHigh * 100 + yearLow;
        const driverReleaseDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        return {
            serialNumber: response.deviceSerialNumber,
            ip,
            subnetMask,
            gateway,
            macAddress,
            driverVersion,
            driverReleaseDate,
            remoteAddress: remoteInfo.address,
            remotePort: remoteInfo.port
        };
    }

    /**
     * Get controller time
     * Function ID: 0x32
     */
    async getControllerTime(controllerInfo) {
        try {
            const packet = this.packetHandler.createPacket(
                this.FUNCTION_IDS.GET_TIME,
                controllerInfo.serialNumber
            );
            
            const { response } = await this.packetHandler.sendPacket(
                packet,
                controllerInfo.ip || controllerInfo.remoteAddress
            );
            
            if (response.functionId === this.FUNCTION_IDS.GET_TIME) {
                const data = response.data;
                const bcdData = {
                    yearHigh: data[0],
                    yearLow: data[1],
                    month: data[2],
                    day: data[3],
                    hour: data[4],
                    minute: data[5],
                    second: data[6]
                };
                
                const date = this.packetHandler.bcdToDate(bcdData);
                await this.configManager.updateLastSeen(controllerInfo.serialNumber);
                
                return {
                    success: true,
                    time: date,
                    timestamp: date.getTime()
                };
            }
            
            throw new Error('Invalid response for get time command');
        } catch (error) {
            throw new Error(`Failed to get controller time: ${error.message}`);
        }
    }

    /**
     * Set controller time
     * Function ID: 0x30
     */
    async setControllerTime(controllerInfo, newTime) {
        try {
            const bcdData = this.packetHandler.dateToBCD(newTime);
            const data = [
                bcdData.yearHigh,
                bcdData.yearLow,
                bcdData.month,
                bcdData.day,
                bcdData.hour,
                bcdData.minute,
                bcdData.second
            ];
            
            const packet = this.packetHandler.createPacket(
                this.FUNCTION_IDS.SET_TIME,
                controllerInfo.serialNumber,
                data
            );
            
            const { response } = await this.packetHandler.sendPacket(
                packet,
                controllerInfo.ip || controllerInfo.remoteAddress
            );
            
            if (response.functionId === this.FUNCTION_IDS.SET_TIME) {
                await this.configManager.updateLastSeen(controllerInfo.serialNumber);
                
                return {
                    success: true,
                    setTime: newTime,
                    timestamp: newTime.getTime()
                };
            }
            
            throw new Error('Invalid response for set time command');
        } catch (error) {
            throw new Error(`Failed to set controller time: ${error.message}`);
        }
    }

    /**
     * Set controller network configuration
     * Function ID: 0x96
     */
    async setControllerNetworkConfig(controllerInfo, networkConfig) {
        try {
            const { ip, subnetMask, gateway } = networkConfig;
            
            const data = [
                ...this.packetHandler.ipToBytes(ip),        // bytes 0-3
                ...this.packetHandler.ipToBytes(subnetMask), // bytes 4-7
                ...this.packetHandler.ipToBytes(gateway),    // bytes 8-11
                0x55, 0xAA, 0xAA, 0x55                      // bytes 12-15: identification
            ];
            
            const packet = this.packetHandler.createPacket(
                this.FUNCTION_IDS.SET_IP,
                controllerInfo.serialNumber,
                data
            );
            
            // Note: Controller will restart after this command and won't return a response
            await this.packetHandler.sendPacket(
                packet,
                controllerInfo.ip || controllerInfo.remoteAddress,
                1000 // Shorter timeout since no response expected
            ).catch(() => {
                // Expected to timeout since controller restarts
            });
            
            // Update config with new network settings
            const updatedController = {
                ...controllerInfo,
                ip,
                subnetMask,
                gateway
            };
            await this.configManager.addController(updatedController);
            
            return {
                success: true,
                message: 'Network configuration sent. Controller will restart.',
                newConfig: { ip, subnetMask, gateway }
            };
        } catch (error) {
            throw new Error(`Failed to set network configuration: ${error.message}`);
        }
    }

    /**
     * Get receiving server configuration
     * Function ID: 0x92
     */
    async getReceivingServer(controllerInfo) {
        try {
            const packet = this.packetHandler.createPacket(
                this.FUNCTION_IDS.GET_RECEIVING_SERVER,
                controllerInfo.serialNumber
            );
            
            const { response } = await this.packetHandler.sendPacket(
                packet,
                controllerInfo.ip || controllerInfo.remoteAddress
            );
            
            if (response.functionId === this.FUNCTION_IDS.GET_RECEIVING_SERVER) {
                const data = response.data;
                
                const serverIp = this.packetHandler.bytesToIp([data[0], data[1], data[2], data[3]]);
                const port = (data[5] << 8) | data[4]; // Little-endian
                const uploadInterval = data[6];
                
                await this.configManager.updateLastSeen(controllerInfo.serialNumber);
                
                return {
                    success: true,
                    serverIp,
                    port,
                    uploadInterval,
                    uploadEnabled: uploadInterval !== 0 && uploadInterval !== 0xFF
                };
            }
            
            throw new Error('Invalid response for get receiving server command');
        } catch (error) {
            throw new Error(`Failed to get receiving server configuration: ${error.message}`);
        }
    }

    /**
     * Set receiving server configuration
     * Function ID: 0x90
     */
    async setReceivingServer(controllerInfo, serverConfig) {
        try {
            const { serverIp, port, uploadInterval = 0 } = serverConfig;
            
            const data = [
                ...this.packetHandler.ipToBytes(serverIp),  // bytes 0-3
                port & 0xFF,                               // byte 4: port low
                (port >> 8) & 0xFF,                        // byte 5: port high
                uploadInterval                             // byte 6: upload interval
            ];
            
            const packet = this.packetHandler.createPacket(
                this.FUNCTION_IDS.SET_RECEIVING_SERVER,
                controllerInfo.serialNumber,
                data
            );
            
            const { response } = await this.packetHandler.sendPacket(
                packet,
                controllerInfo.ip || controllerInfo.remoteAddress
            );
            
            if (response.functionId === this.FUNCTION_IDS.SET_RECEIVING_SERVER && response.data[0] === 1) {
                await this.configManager.updateLastSeen(controllerInfo.serialNumber);
                
                return {
                    success: true,
                    serverConfig: { serverIp, port, uploadInterval }
                };
            }
            
            throw new Error('Controller rejected receiving server configuration');
        } catch (error) {
            throw new Error(`Failed to set receiving server configuration: ${error.message}`);
        }
    }

    /**
     * Get all saved controllers
     */
    async getSavedControllers() {
        return await this.configManager.loadControllers();
    }

    /**
     * Get controller by serial number
     */
    async getControllerBySerial(serialNumber) {
        return await this.configManager.getController(serialNumber);
    }

    /**
     * Remove controller from saved list
     */
    async removeController(serialNumber) {
        return await this.configManager.removeController(serialNumber);
    }

    /**
     * Clear all saved controllers
     */
    async clearSavedControllers() {
        return await this.configManager.clearControllers();
    }
}

module.exports = ControllerAPI;
