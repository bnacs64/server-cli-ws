#!/usr/bin/env node

// Diagnostic script for controller communication issues
// Helps identify why the controller at 192.168.2.66 is not responding

const dgram = require('dgram');
const PacketHandler = require('./src/core/packet-handler');

const CONTROLLER_IP = '192.168.2.66';
const CONTROLLER_PORT = 60000;

class ControllerDiagnostic {
    constructor() {
        this.packetHandler = new PacketHandler();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'debug': '🔍'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    // Test 1: Direct UDP packet to specific IP
    async testDirectUDP() {
        this.log('Testing direct UDP communication to 192.168.2.66:60000...', 'debug');

        return new Promise((resolve) => {
            const client = dgram.createSocket('udp4');
            const packet = this.packetHandler.createPacket(0x94, 0); // Discovery packet
            let responseReceived = false;

            this.log(`Discovery packet details:`, 'debug');
            this.log(`  Length: ${packet.length} bytes`, 'debug');
            this.log(`  Type: 0x${packet[0].toString(16).padStart(2, '0')}`, 'debug');
            this.log(`  Function: 0x${packet[1].toString(16).padStart(2, '0')}`, 'debug');
            this.log(`  Reserved: 0x${packet.readUInt16LE(2).toString(16).padStart(4, '0')}`, 'debug');
            this.log(`  Serial: 0x${packet.readUInt32LE(4).toString(16).padStart(8, '0')}`, 'debug');
            this.log(`  Hex: ${packet.toString('hex')}`, 'debug');

            const timeout = setTimeout(() => {
                if (!responseReceived) {
                    client.close();
                    this.log('Direct UDP test: No response (timeout)', 'error');
                    resolve(false);
                }
            }, 8000); // Increased timeout

            client.on('message', (msg, rinfo) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeout);
                    client.close();

                    this.log(`Direct UDP test: Response received from ${rinfo.address}:${rinfo.port}`, 'success');
                    this.log(`Response length: ${msg.length} bytes`, 'info');
                    this.log(`Response hex: ${msg.toString('hex')}`, 'debug');

                    try {
                        const parsed = this.packetHandler.parsePacket(msg);
                        this.log(`Function ID: 0x${parsed.functionId.toString(16)}`, 'info');
                        this.log(`Device Serial: ${parsed.deviceSerialNumber}`, 'info');

                        // Try to parse as discovery response
                        if (parsed.functionId === 0x94) {
                            const controllerInfo = this.parseDiscoveryResponse(parsed, rinfo);
                            this.log(`Controller IP: ${controllerInfo.ip}`, 'info');
                            this.log(`Controller MAC: ${controllerInfo.macAddress}`, 'info');
                            this.log(`Driver Version: ${controllerInfo.driverVersion}`, 'info');
                        }

                        resolve(true);
                    } catch (error) {
                        this.log(`Failed to parse response: ${error.message}`, 'error');
                        this.log(`Raw response for analysis: ${msg.toString('hex')}`, 'debug');
                        resolve(false);
                    }
                }
            });

            client.on('error', (err) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeout);
                    client.close();
                    this.log(`Direct UDP test error: ${err.message}`, 'error');
                    resolve(false);
                }
            });

            this.log(`Sending discovery packet to ${CONTROLLER_IP}:${CONTROLLER_PORT}`, 'info');
            client.send(packet, CONTROLLER_PORT, CONTROLLER_IP, (err) => {
                if (err) {
                    this.log(`Failed to send packet: ${err.message}`, 'error');
                    clearTimeout(timeout);
                    client.close();
                    resolve(false);
                }
            });
        });
    }

    // Helper method to parse discovery response
    parseDiscoveryResponse(response, remoteInfo) {
        const data = response.data;

        // Extract IP address (bytes 0-3 of data)
        const ip = this.packetHandler.bytesToIp([data[0], data[1], data[2], data[3]]);

        // Extract subnet mask (bytes 4-7 of data)
        const subnetMask = this.packetHandler.bytesToIp([data[4], data[5], data[6], data[7]]);

        // Extract gateway (bytes 8-11 of data)
        const gateway = this.packetHandler.bytesToIp([data[8], data[9], data[10], data[11]]);

        // Extract MAC address (bytes 12-17 of data)
        const macAddress = data.slice(12, 18).map(b => b.toString(16).padStart(2, '0')).join(':');

        // Extract driver version (bytes 18-19 of data, BCD format)
        const driverVersionLow = data[18];
        const driverVersionHigh = data[19];
        const driverVersion = `${this.packetHandler.bcdToDecimal(driverVersionHigh)}.${this.packetHandler.bcdToDecimal(driverVersionLow)}`;

        // Extract driver release date (bytes 20-23 of data, BCD format)
        const year = this.packetHandler.bcdToDecimal(data[21]) * 100 + this.packetHandler.bcdToDecimal(data[20]);
        const month = this.packetHandler.bcdToDecimal(data[22]);
        const day = this.packetHandler.bcdToDecimal(data[23]);
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

    // Test 2: Broadcast discovery with detailed logging
    async testBroadcastDiscovery() {
        this.log('Testing broadcast discovery with detailed logging...', 'debug');
        
        return new Promise((resolve) => {
            const client = dgram.createSocket('udp4');
            const packet = this.packetHandler.createPacket(0x94, 0);
            const responses = [];
            let bindComplete = false;

            client.bind(() => {
                bindComplete = true;
                client.setBroadcast(true);
                this.log('UDP socket bound and broadcast enabled', 'info');
                
                const timeout = setTimeout(() => {
                    client.close();
                    this.log(`Broadcast discovery complete. Found ${responses.length} response(s)`, 'info');
                    resolve(responses);
                }, 8000);

                client.on('message', (msg, rinfo) => {
                    this.log(`Response from ${rinfo.address}:${rinfo.port}`, 'success');
                    
                    try {
                        const parsed = this.packetHandler.parsePacket(msg);
                        responses.push({ parsed, rinfo });
                        this.log(`  Serial: ${parsed.deviceSerialNumber}`, 'info');
                        this.log(`  Function ID: 0x${parsed.functionId.toString(16)}`, 'info');
                    } catch (error) {
                        this.log(`  Parse error: ${error.message}`, 'error');
                    }
                });

                // Try multiple broadcast addresses
                const broadcastAddresses = [
                    '255.255.255.255',
                    '192.168.2.255',    // Specific to your network
                    '192.168.1.255',
                    '192.168.0.255',
                    '10.0.0.255'
                ];

                broadcastAddresses.forEach(addr => {
                    this.log(`Broadcasting to ${addr}:${CONTROLLER_PORT}`, 'info');
                    client.send(packet, CONTROLLER_PORT, addr, (err) => {
                        if (err) {
                            this.log(`Broadcast to ${addr} failed: ${err.message}`, 'error');
                        }
                    });
                });
            });

            client.on('error', (err) => {
                this.log(`Broadcast test error: ${err.message}`, 'error');
                if (!bindComplete) {
                    resolve([]);
                }
            });
        });
    }

    // Test 3: Network interface analysis
    async testNetworkInterfaces() {
        this.log('Analyzing network interfaces...', 'debug');
        
        const os = require('os');
        const interfaces = os.networkInterfaces();
        
        this.log('Available network interfaces:', 'info');
        Object.keys(interfaces).forEach(name => {
            const iface = interfaces[name];
            iface.forEach(details => {
                if (details.family === 'IPv4' && !details.internal) {
                    this.log(`  ${name}: ${details.address}/${details.netmask}`, 'info');
                    
                    // Check if controller IP is in same subnet
                    const controllerOctets = CONTROLLER_IP.split('.').map(Number);
                    const ifaceOctets = details.address.split('.').map(Number);
                    const maskOctets = details.netmask.split('.').map(Number);
                    
                    let sameSubnet = true;
                    for (let i = 0; i < 4; i++) {
                        if ((controllerOctets[i] & maskOctets[i]) !== (ifaceOctets[i] & maskOctets[i])) {
                            sameSubnet = false;
                            break;
                        }
                    }
                    
                    if (sameSubnet) {
                        this.log(`    ✅ Controller ${CONTROLLER_IP} is in same subnet`, 'success');
                    } else {
                        this.log(`    ⚠️  Controller ${CONTROLLER_IP} is in different subnet`, 'warning');
                    }
                }
            });
        });
    }

    // Test 4: Raw packet analysis
    async testRawPacketFormat() {
        this.log('Testing raw packet format...', 'debug');
        
        const packet = this.packetHandler.createPacket(0x94, 0);
        
        this.log(`Packet length: ${packet.length} bytes`, 'info');
        this.log(`Packet hex: ${packet.toString('hex')}`, 'info');
        
        // Show packet structure
        this.log('Packet structure:', 'info');
        this.log(`  Byte 0 (Type): 0x${packet[0].toString(16).padStart(2, '0')}`, 'info');
        this.log(`  Byte 1 (Function): 0x${packet[1].toString(16).padStart(2, '0')}`, 'info');
        this.log(`  Bytes 2-3 (Reserved): 0x${packet.readUInt16LE(2).toString(16).padStart(4, '0')}`, 'info');
        this.log(`  Bytes 4-7 (Serial): 0x${packet.readUInt32LE(4).toString(16).padStart(8, '0')}`, 'info');
        
        // Verify packet matches SDK specification
        const isValid = packet[0] === 0x17 && packet[1] === 0x94 && packet.length === 64;
        this.log(`Packet format valid: ${isValid}`, isValid ? 'success' : 'error');
    }

    // Test 5: Alternative discovery methods
    async testAlternativeDiscovery() {
        this.log('Testing alternative discovery methods...', 'debug');
        
        // Method 1: Try different function IDs
        const functionIds = [0x94, 0x32, 0x20]; // Discovery, Get Time, Query Status
        
        for (const funcId of functionIds) {
            this.log(`Trying function ID 0x${funcId.toString(16)}...`, 'info');
            
            const success = await new Promise((resolve) => {
                const client = dgram.createSocket('udp4');
                const packet = this.packetHandler.createPacket(funcId, 0);
                let responseReceived = false;

                const timeout = setTimeout(() => {
                    if (!responseReceived) {
                        client.close();
                        resolve(false);
                    }
                }, 3000);

                client.on('message', (msg, rinfo) => {
                    if (!responseReceived && rinfo.address === CONTROLLER_IP) {
                        responseReceived = true;
                        clearTimeout(timeout);
                        client.close();
                        this.log(`  Response received for function 0x${funcId.toString(16)}`, 'success');
                        resolve(true);
                    }
                });

                client.on('error', () => {
                    if (!responseReceived) {
                        responseReceived = true;
                        clearTimeout(timeout);
                        client.close();
                        resolve(false);
                    }
                });

                client.send(packet, CONTROLLER_PORT, CONTROLLER_IP, (err) => {
                    if (err) {
                        clearTimeout(timeout);
                        client.close();
                        resolve(false);
                    }
                });
            });

            if (success) {
                this.log(`Function 0x${funcId.toString(16)} works!`, 'success');
                return true;
            }
        }
        
        return false;
    }

    // Test 6: Port scanning
    async testPortScanning() {
        this.log('Testing different ports on controller...', 'debug');
        
        const ports = [60000, 4370, 37777, 8000, 80, 23, 22];
        
        for (const port of ports) {
            const isOpen = await new Promise((resolve) => {
                const client = dgram.createSocket('udp4');
                const packet = this.packetHandler.createPacket(0x94, 0);
                
                const timeout = setTimeout(() => {
                    client.close();
                    resolve(false);
                }, 2000);

                client.on('message', (msg, rinfo) => {
                    if (rinfo.address === CONTROLLER_IP) {
                        clearTimeout(timeout);
                        client.close();
                        resolve(true);
                    }
                });

                client.on('error', () => {
                    clearTimeout(timeout);
                    client.close();
                    resolve(false);
                });

                client.send(packet, port, CONTROLLER_IP, (err) => {
                    if (err) {
                        clearTimeout(timeout);
                        client.close();
                        resolve(false);
                    }
                });
            });

            if (isOpen) {
                this.log(`Port ${port} responds to UDP packets`, 'success');
            } else {
                this.log(`Port ${port} no response`, 'info');
            }
        }
    }

    async runDiagnostics() {
        this.log(`Starting diagnostic tests for controller at ${CONTROLLER_IP}`, 'info');
        this.log('', 'info');

        // Run all diagnostic tests
        await this.testNetworkInterfaces();
        this.log('', 'info');
        
        await this.testRawPacketFormat();
        this.log('', 'info');
        
        const directResult = await this.testDirectUDP();
        this.log('', 'info');
        
        const broadcastResults = await this.testBroadcastDiscovery();
        this.log('', 'info');
        
        if (!directResult && broadcastResults.length === 0) {
            await this.testAlternativeDiscovery();
            this.log('', 'info');
            
            await this.testPortScanning();
            this.log('', 'info');
        }

        // Summary and recommendations
        this.log('='.repeat(60), 'info');
        this.log('DIAGNOSTIC SUMMARY', 'info');
        this.log('='.repeat(60), 'info');
        
        if (directResult) {
            this.log('✅ Controller responds to direct UDP communication', 'success');
            this.log('💡 The controller is working. Check discovery broadcast logic.', 'info');
        } else if (broadcastResults.length > 0) {
            this.log('✅ Controllers found via broadcast, but not the target', 'warning');
            this.log('💡 Check if 192.168.2.66 is the correct IP address.', 'info');
        } else {
            this.log('❌ No response from controller', 'error');
            this.log('💡 Possible issues:', 'info');
            this.log('   - Controller is not powered on', 'info');
            this.log('   - Controller is not at 192.168.2.66', 'info');
            this.log('   - Controller is not on UDP port 60000', 'info');
            this.log('   - Firewall blocking UDP traffic', 'info');
            this.log('   - Controller uses different packet format', 'info');
            this.log('   - Network routing issues', 'info');
        }
        
        this.log('', 'info');
        this.log('💡 Next steps:', 'info');
        this.log('1. Verify controller IP with: ping 192.168.2.66', 'info');
        this.log('2. Check controller documentation for correct port', 'info');
        this.log('3. Try controller management software if available', 'info');
        this.log('4. Check controller display/interface for network settings', 'info');
    }
}

// Main execution
async function main() {
    const diagnostic = new ControllerDiagnostic();
    await diagnostic.runDiagnostics();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ControllerDiagnostic;
