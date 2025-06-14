const dgram = require('dgram');
const os = require('os');

/**
 * Enhanced Packet Handler for Controller Communication
 * Handles UDP packet creation, parsing, BCD encoding/decoding, and cross-platform network discovery
 */
class PacketHandler {
    constructor() {
        this.PACKET_SIZE = 64;
        this.CONTROLLER_PORT = 60000;
        this.TYPE_BYTE = 0x17;

        // Discovery configuration
        this.discoveryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
            duplicateDetectionWindow: 5000,
            enableUnicastFallback: true,
            enableInterfaceDetection: true
        };

        // Cache for discovered controllers to prevent duplicates
        this.discoveryCache = new Map();
    }

    /**
     * Convert decimal to BCD (Binary-Coded Decimal)
     * Formula: BCD = decimal + (decimal / 10) * 6
     */
    decimalToBCD(decimal) {
        return decimal + Math.floor(decimal / 10) * 6;
    }

    /**
     * Convert BCD to decimal
     * Formula: decimal = BCD - (BCD / 16) * 6
     */
    bcdToDecimal(bcd) {
        return bcd - Math.floor(bcd / 16) * 6;
    }

    /**
     * Convert date to BCD format for controller
     */
    dateToBCD(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        return {
            yearHigh: this.decimalToBCD(Math.floor(year / 100)),
            yearLow: this.decimalToBCD(year % 100),
            month: this.decimalToBCD(month),
            day: this.decimalToBCD(day),
            hour: this.decimalToBCD(hour),
            minute: this.decimalToBCD(minute),
            second: this.decimalToBCD(second)
        };
    }

    /**
     * Convert BCD format to JavaScript Date
     */
    bcdToDate(bcdData) {
        const year = this.bcdToDecimal(bcdData.yearHigh) * 100 + this.bcdToDecimal(bcdData.yearLow);
        const month = this.bcdToDecimal(bcdData.month) - 1; // JS months are 0-based
        const day = this.bcdToDecimal(bcdData.day);
        const hour = this.bcdToDecimal(bcdData.hour);
        const minute = this.bcdToDecimal(bcdData.minute);
        const second = this.bcdToDecimal(bcdData.second);

        return new Date(year, month, day, hour, minute, second);
    }

    /**
     * Convert device serial number to little-endian bytes
     */
    serialNumberToBytes(serialNumber) {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt32LE(serialNumber, 0);
        return Array.from(buffer);
    }

    /**
     * Convert little-endian bytes to device serial number
     */
    bytesToSerialNumber(bytes) {
        const buffer = Buffer.from(bytes);
        return buffer.readUInt32LE(0);
    }

    /**
     * Convert IP address string to bytes
     */
    ipToBytes(ipString) {
        return ipString.split('.').map(octet => parseInt(octet, 10));
    }

    /**
     * Convert bytes to IP address string
     */
    bytesToIp(bytes) {
        return bytes.join('.');
    }

    /**
     * Get all network interfaces with their broadcast addresses
     * Cross-platform implementation for Windows, macOS, and Linux
     */
    getNetworkInterfaces() {
        const interfaces = os.networkInterfaces();
        const networkInfo = [];

        Object.keys(interfaces).forEach(interfaceName => {
            const interfaceData = interfaces[interfaceName];

            interfaceData.forEach(addr => {
                // Only process IPv4 addresses that are not internal
                if (addr.family === 'IPv4' && !addr.internal) {
                    const networkInfo_item = {
                        name: interfaceName,
                        address: addr.address,
                        netmask: addr.netmask,
                        mac: addr.mac,
                        broadcast: this.calculateBroadcastAddress(addr.address, addr.netmask),
                        network: this.calculateNetworkAddress(addr.address, addr.netmask),
                        platform: os.platform()
                    };

                    // Add platform-specific interface type detection
                    networkInfo_item.type = this.detectInterfaceType(interfaceName);
                    networkInfo_item.priority = this.getInterfacePriority(interfaceName, networkInfo_item.type);

                    networkInfo.push(networkInfo_item);
                }
            });
        });

        // Sort by priority (higher priority first)
        return networkInfo.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Calculate broadcast address from IP and netmask
     */
    calculateBroadcastAddress(ip, netmask) {
        const ipParts = ip.split('.').map(Number);
        const maskParts = netmask.split('.').map(Number);

        const broadcastParts = ipParts.map((ipPart, index) => {
            return ipPart | (255 - maskParts[index]);
        });

        return broadcastParts.join('.');
    }

    /**
     * Calculate network address from IP and netmask
     */
    calculateNetworkAddress(ip, netmask) {
        const ipParts = ip.split('.').map(Number);
        const maskParts = netmask.split('.').map(Number);

        const networkParts = ipParts.map((ipPart, index) => {
            return ipPart & maskParts[index];
        });

        return networkParts.join('.');
    }

    /**
     * Detect interface type based on name (cross-platform)
     */
    detectInterfaceType(interfaceName) {
        const name = interfaceName.toLowerCase();

        // Ethernet interfaces
        if (name.includes('eth') || name.includes('ethernet') ||
            name.includes('en') || name.includes('lan')) {
            return 'ethernet';
        }

        // WiFi interfaces
        if (name.includes('wifi') || name.includes('wlan') ||
            name.includes('wireless') || name.includes('wi-fi')) {
            return 'wifi';
        }

        // Virtual interfaces
        if (name.includes('vbox') || name.includes('vmware') ||
            name.includes('virtual') || name.includes('docker') ||
            name.includes('bridge') || name.includes('tap') ||
            name.includes('tun')) {
            return 'virtual';
        }

        // Loopback
        if (name.includes('lo') || name.includes('loopback')) {
            return 'loopback';
        }

        return 'unknown';
    }

    /**
     * Get interface priority for discovery (higher = better)
     */
    getInterfacePriority(interfaceName, type) {
        let priority = 0;

        // Base priority by type
        switch (type) {
            case 'ethernet': priority = 100; break;
            case 'wifi': priority = 80; break;
            case 'unknown': priority = 50; break;
            case 'virtual': priority = 20; break;
            case 'loopback': priority = 0; break;
        }

        // Boost priority for interfaces likely to be connected to controllers
        const name = interfaceName.toLowerCase();
        if (name.includes('ethernet') || name.includes('lan') ||
            name.includes('eth0') || name.includes('en0')) {
            priority += 20;
        }

        return priority;
    }

    /**
     * Create a basic packet structure
     */
    createPacket(functionId, deviceSerialNumber = 0, data = null, sequenceId = 0) {
        const packet = Buffer.alloc(this.PACKET_SIZE, 0);
        
        // Basic header
        packet[0] = this.TYPE_BYTE;           // type (0x17)
        packet[1] = functionId;               // function ID
        packet[2] = 0x00;                     // reserved
        packet[3] = 0x00;                     // reserved
        
        // Device serial number (little-endian)
        const serialBytes = this.serialNumberToBytes(deviceSerialNumber);
        packet[4] = serialBytes[0];
        packet[5] = serialBytes[1];
        packet[6] = serialBytes[2];
        packet[7] = serialBytes[3];
        
        // Data section (bytes 8-39, 32 bytes)
        if (data && data.length > 0) {
            const dataLength = Math.min(data.length, 32);
            for (let i = 0; i < dataLength; i++) {
                packet[8 + i] = data[i];
            }
        }
        
        // Sequence ID (bytes 40-43)
        const seqBuffer = Buffer.allocUnsafe(4);
        seqBuffer.writeUInt32LE(sequenceId, 0);
        packet[40] = seqBuffer[0];
        packet[41] = seqBuffer[1];
        packet[42] = seqBuffer[2];
        packet[43] = seqBuffer[3];
        
        // Extended data (bytes 44-63) - already zeroed by Buffer.alloc
        
        return packet;
    }

    /**
     * Parse received packet
     */
    parsePacket(buffer) {
        if (buffer.length !== this.PACKET_SIZE) {
            throw new Error(`Invalid packet size: ${buffer.length}, expected ${this.PACKET_SIZE}`);
        }

        const packet = {
            type: buffer[0],
            functionId: buffer[1],
            reserved: buffer.readUInt16LE(2),
            deviceSerialNumber: this.bytesToSerialNumber([buffer[4], buffer[5], buffer[6], buffer[7]]),
            data: Array.from(buffer.slice(8, 40)),
            sequenceId: buffer.readUInt32LE(40),
            extendedData: Array.from(buffer.slice(44, 64))
        };

        return packet;
    }

    /**
     * Send UDP packet and wait for response
     */
    async sendPacket(packet, targetIp, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            let responseReceived = false;

            const timeoutId = setTimeout(() => {
                if (!responseReceived) {
                    client.close();
                    reject(new Error('Timeout waiting for response'));
                }
            }, timeout);

            client.on('message', (msg, rinfo) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    client.close();
                    
                    try {
                        const response = this.parsePacket(msg);
                        resolve({ response, remoteInfo: rinfo });
                    } catch (error) {
                        reject(error);
                    }
                }
            });

            client.on('error', (err) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    client.close();
                    reject(err);
                }
            });

            client.send(packet, this.CONTROLLER_PORT, targetIp, (err) => {
                if (err && !responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    client.close();
                    reject(err);
                }
            });
        });
    }

    /**
     * Enhanced broadcast packet for discovery with cross-platform network interface support
     */
    async broadcastPacket(packet, timeout = 5000) {
        const responses = [];
        const startTime = Date.now();

        // Clear old cache entries
        this.cleanDiscoveryCache();

        try {
            // Try enhanced discovery first
            const enhancedResponses = await this.enhancedDiscovery(packet, timeout);
            responses.push(...enhancedResponses);

            // If no responses and unicast fallback is enabled, try known IP ranges
            if (responses.length === 0 && this.discoveryConfig.enableUnicastFallback) {
                const remainingTime = timeout - (Date.now() - startTime);
                if (remainingTime > 1000) {
                    const unicastResponses = await this.unicastDiscovery(packet, remainingTime);
                    responses.push(...unicastResponses);
                }
            }

            return this.deduplicateResponses(responses);

        } catch (error) {
            // Fallback to legacy discovery if enhanced discovery fails
            console.warn('Enhanced discovery failed, falling back to legacy method:', error.message);
            return await this.legacyBroadcastPacket(packet, timeout);
        }
    }

    /**
     * Enhanced discovery using network interface detection
     */
    async enhancedDiscovery(packet, timeout) {
        const responses = [];
        const networkInterfaces = this.getNetworkInterfaces();

        if (networkInterfaces.length === 0) {
            throw new Error('No suitable network interfaces found');
        }

        console.log(`Found ${networkInterfaces.length} network interface(s) for discovery`);

        // Try discovery with retry mechanism
        for (let attempt = 1; attempt <= this.discoveryConfig.maxRetries; attempt++) {
            console.log(`Discovery attempt ${attempt}/${this.discoveryConfig.maxRetries}`);

            const attemptResponses = await this.performDiscoveryAttempt(packet, networkInterfaces, timeout);
            responses.push(...attemptResponses);

            // If we found controllers, we can stop retrying
            if (responses.length > 0) {
                console.log(`Found ${responses.length} controller(s) on attempt ${attempt}`);
                break;
            }

            // Wait before retry (with exponential backoff if enabled)
            if (attempt < this.discoveryConfig.maxRetries) {
                const delay = this.discoveryConfig.exponentialBackoff
                    ? this.discoveryConfig.retryDelay * Math.pow(2, attempt - 1)
                    : this.discoveryConfig.retryDelay;

                console.log(`Waiting ${delay}ms before retry...`);
                await this.sleep(delay);
            }
        }

        return responses;
    }

    /**
     * Perform a single discovery attempt across all network interfaces
     */
    async performDiscoveryAttempt(packet, networkInterfaces, timeout) {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const responses = [];
            let timeoutId;

            client.bind(() => {
                client.setBroadcast(true);

                timeoutId = setTimeout(() => {
                    client.close();
                    resolve(responses);
                }, timeout);

                client.on('message', (msg, rinfo) => {
                    try {
                        const response = this.parsePacket(msg);
                        const responseKey = this.generateResponseKey(response, rinfo);

                        // Check for duplicates
                        if (!this.discoveryCache.has(responseKey)) {
                            this.discoveryCache.set(responseKey, Date.now());
                            responses.push({ response, remoteInfo: rinfo });
                            console.log(`Controller response from ${rinfo.address}:${rinfo.port}`);
                        }
                    } catch (error) {
                        console.warn('Failed to parse response packet:', error.message);
                    }
                });

                client.on('error', (err) => {
                    clearTimeout(timeoutId);
                    client.close();
                    reject(err);
                });

                // Send to broadcast addresses for each interface
                const broadcastAddresses = this.generateBroadcastAddresses(networkInterfaces);

                console.log(`Broadcasting to ${broadcastAddresses.length} address(es): ${broadcastAddresses.join(', ')}`);

                broadcastAddresses.forEach(addr => {
                    client.send(packet, this.CONTROLLER_PORT, addr, (err) => {
                        if (err) {
                            console.warn(`Failed to broadcast to ${addr}:`, err.message);
                        }
                    });
                });
            });
        });
    }

    /**
     * Generate broadcast addresses from network interfaces
     */
    generateBroadcastAddresses(networkInterfaces) {
        const addresses = new Set();

        // Add interface-specific broadcast addresses
        networkInterfaces.forEach(iface => {
            if (iface.broadcast && iface.type !== 'loopback' && iface.type !== 'virtual') {
                addresses.add(iface.broadcast);
            }
        });

        // Add common broadcast addresses as fallback
        const commonAddresses = [
            '255.255.255.255',
            '192.168.2.255',    // Known controller network
            '192.168.1.255',
            '192.168.0.255',
            '10.0.0.255',
            '172.16.0.255'
        ];

        commonAddresses.forEach(addr => addresses.add(addr));

        return Array.from(addresses);
    }

    /**
     * Unicast discovery to specific IP addresses when broadcast fails
     */
    async unicastDiscovery(packet, timeout) {
        const responses = [];
        const networkInterfaces = this.getNetworkInterfaces();
        const targetIPs = this.generateUnicastTargets(networkInterfaces);

        console.log(`Attempting unicast discovery to ${targetIPs.length} target(s)`);

        // Try each target IP with a shorter timeout
        const perTargetTimeout = Math.min(timeout / targetIPs.length, 2000);

        for (const targetIP of targetIPs) {
            try {
                console.log(`Trying unicast discovery to ${targetIP}`);
                const response = await this.sendPacket(packet, targetIP, perTargetTimeout);

                if (response && response.response.functionId === 0x94) {
                    const responseKey = this.generateResponseKey(response.response, response.remoteInfo);

                    if (!this.discoveryCache.has(responseKey)) {
                        this.discoveryCache.set(responseKey, Date.now());
                        responses.push(response);
                        console.log(`Unicast discovery successful: ${targetIP}`);
                    }
                }
            } catch (error) {
                // Ignore individual unicast failures
                console.debug(`Unicast to ${targetIP} failed: ${error.message}`);
            }
        }

        return responses;
    }

    /**
     * Generate unicast target IPs based on network interfaces
     */
    generateUnicastTargets(networkInterfaces) {
        const targets = new Set();

        // Add known controller IP
        targets.add('192.168.2.66');
        targets.add('192.168.2.120'); // Known response IP

        // Generate targets based on network interfaces
        networkInterfaces.forEach(iface => {
            if (iface.type === 'ethernet' || iface.type === 'wifi') {
                const network = iface.network;
                const networkParts = network.split('.');

                // Try common controller IPs in this network
                const commonLastOctets = [1, 2, 10, 20, 50, 66, 100, 120, 200, 254];
                commonLastOctets.forEach(lastOctet => {
                    const targetIP = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${lastOctet}`;
                    targets.add(targetIP);
                });
            }
        });

        return Array.from(targets);
    }

    /**
     * Legacy broadcast method for fallback compatibility
     */
    async legacyBroadcastPacket(packet, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const responses = [];
            let timeoutId;

            client.bind(() => {
                client.setBroadcast(true);

                timeoutId = setTimeout(() => {
                    client.close();
                    resolve(responses);
                }, timeout);

                client.on('message', (msg, rinfo) => {
                    try {
                        const response = this.parsePacket(msg);
                        responses.push({ response, remoteInfo: rinfo });
                    } catch (error) {
                        console.warn('Failed to parse response packet:', error.message);
                    }
                });

                client.on('error', (err) => {
                    clearTimeout(timeoutId);
                    client.close();
                    reject(err);
                });

                // Broadcast to common network ranges
                const broadcastAddresses = [
                    '255.255.255.255',
                    '192.168.2.255',
                    '192.168.1.255',
                    '192.168.0.255',
                    '10.0.0.255'
                ];

                broadcastAddresses.forEach(addr => {
                    client.send(packet, this.CONTROLLER_PORT, addr, (err) => {
                        if (err) {
                            console.warn(`Failed to broadcast to ${addr}:`, err.message);
                        }
                    });
                });
            });
        });
    }

    /**
     * Generate unique key for response deduplication
     */
    generateResponseKey(response, remoteInfo) {
        return `${response.deviceSerialNumber}-${remoteInfo.address}-${remoteInfo.port}`;
    }

    /**
     * Remove duplicate responses based on serial number and source
     */
    deduplicateResponses(responses) {
        const seen = new Set();
        return responses.filter(({ response, remoteInfo }) => {
            const key = this.generateResponseKey(response, remoteInfo);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Clean old entries from discovery cache
     */
    cleanDiscoveryCache() {
        const now = Date.now();
        const maxAge = this.discoveryConfig.duplicateDetectionWindow;

        for (const [key, timestamp] of this.discoveryCache.entries()) {
            if (now - timestamp > maxAge) {
                this.discoveryCache.delete(key);
            }
        }
    }

    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Configure discovery behavior
     */
    setDiscoveryConfig(config) {
        this.discoveryConfig = { ...this.discoveryConfig, ...config };
    }

    /**
     * Get current discovery configuration
     */
    getDiscoveryConfig() {
        return { ...this.discoveryConfig };
    }

    /**
     * Get network interface information for debugging
     */
    getNetworkInfo() {
        return {
            interfaces: this.getNetworkInterfaces(),
            platform: os.platform(),
            hostname: os.hostname(),
            discoveryConfig: this.discoveryConfig
        };
    }
}

module.exports = PacketHandler;
