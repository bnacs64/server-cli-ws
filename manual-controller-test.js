#!/usr/bin/env node

// Manual controller test - Interactive testing tool
// Allows you to manually test different approaches to communicate with the controller

const dgram = require('dgram');
const PacketHandler = require('./src/core/packet-handler');
const readline = require('readline');

class ManualControllerTest {
    constructor() {
        this.packetHandler = new PacketHandler();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'input': '❓'
        }[type] || '📋';
        
        console.log(`${prefix} ${message}`);
    }

    async question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    async sendPacketToController(ip, port, functionId, serialNumber = 0, timeout = 5000) {
        return new Promise((resolve) => {
            const client = dgram.createSocket('udp4');
            const packet = this.packetHandler.createPacket(functionId, serialNumber);
            let responseReceived = false;

            this.log(`Sending packet to ${ip}:${port}`);
            this.log(`Function ID: 0x${functionId.toString(16)}, Serial: ${serialNumber}`);
            this.log(`Packet: ${packet.toString('hex')}`);

            const timeoutId = setTimeout(() => {
                if (!responseReceived) {
                    responseReceived = true;
                    client.close();
                    this.log('No response received (timeout)', 'error');
                    resolve(null);
                }
            }, timeout);

            client.on('message', (msg, rinfo) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    client.close();
                    
                    this.log(`Response received from ${rinfo.address}:${rinfo.port}`, 'success');
                    this.log(`Response length: ${msg.length} bytes`);
                    this.log(`Response hex: ${msg.toString('hex')}`);
                    
                    try {
                        const parsed = this.packetHandler.parsePacket(msg);
                        this.log(`Parsed response:`, 'success');
                        this.log(`  Type: 0x${parsed.type.toString(16)}`);
                        this.log(`  Function ID: 0x${parsed.functionId.toString(16)}`);
                        this.log(`  Serial Number: ${parsed.deviceSerialNumber}`);
                        
                        resolve(parsed);
                    } catch (error) {
                        this.log(`Failed to parse response: ${error.message}`, 'error');
                        resolve({ raw: msg, error: error.message });
                    }
                }
            });

            client.on('error', (err) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    client.close();
                    this.log(`Socket error: ${err.message}`, 'error');
                    resolve(null);
                }
            });

            client.send(packet, port, ip, (err) => {
                if (err) {
                    clearTimeout(timeoutId);
                    client.close();
                    this.log(`Send error: ${err.message}`, 'error');
                    resolve(null);
                }
            });
        });
    }

    async testDiscovery() {
        this.log('=== Discovery Test ===');
        
        const ip = await this.question('Enter controller IP (default: 192.168.2.66): ') || '192.168.2.66';
        const port = parseInt(await this.question('Enter controller port (default: 60000): ') || '60000');
        const timeout = parseInt(await this.question('Enter timeout in ms (default: 5000): ') || '5000');
        
        this.log(`Testing discovery on ${ip}:${port}`);
        const result = await this.sendPacketToController(ip, port, 0x94, 0, timeout);
        
        if (result) {
            this.log('Discovery successful!', 'success');
            return { ip, port, serialNumber: result.deviceSerialNumber };
        } else {
            this.log('Discovery failed', 'error');
            return null;
        }
    }

    async testGetTime(controllerInfo) {
        this.log('=== Get Time Test ===');
        
        if (!controllerInfo) {
            this.log('No controller info available. Run discovery first.', 'error');
            return;
        }
        
        this.log(`Testing get time on controller ${controllerInfo.serialNumber}`);
        const result = await this.sendPacketToController(
            controllerInfo.ip, 
            controllerInfo.port, 
            0x32, 
            controllerInfo.serialNumber
        );
        
        if (result && result.functionId === 0x32) {
            this.log('Get time successful!', 'success');
            
            // Parse time from response
            const data = result.data;
            if (data && data.length >= 7) {
                try {
                    const bcdData = {
                        yearHigh: data[0],
                        yearLow: data[1],
                        month: data[2],
                        day: data[3],
                        hour: data[4],
                        minute: data[5],
                        second: data[6]
                    };
                    
                    const time = this.packetHandler.bcdToDate(bcdData);
                    this.log(`Controller time: ${time.toLocaleString()}`, 'success');
                } catch (error) {
                    this.log(`Failed to parse time: ${error.message}`, 'error');
                }
            }
        } else {
            this.log('Get time failed', 'error');
        }
    }

    async testSetTime(controllerInfo) {
        this.log('=== Set Time Test ===');
        
        if (!controllerInfo) {
            this.log('No controller info available. Run discovery first.', 'error');
            return;
        }
        
        const useCurrentTime = await this.question('Use current system time? (y/n): ');
        let targetTime;
        
        if (useCurrentTime.toLowerCase() === 'y') {
            targetTime = new Date();
        } else {
            const timeStr = await this.question('Enter time (YYYY-MM-DD HH:MM:SS): ');
            targetTime = new Date(timeStr);
            if (isNaN(targetTime.getTime())) {
                this.log('Invalid time format', 'error');
                return;
            }
        }
        
        this.log(`Setting controller time to: ${targetTime.toLocaleString()}`);
        
        // Create time packet
        const bcdData = this.packetHandler.dateToBCD(targetTime);
        const timePacket = this.packetHandler.createPacket(0x30, controllerInfo.serialNumber, [
            bcdData.yearHigh,
            bcdData.yearLow,
            bcdData.month,
            bcdData.day,
            bcdData.hour,
            bcdData.minute,
            bcdData.second
        ]);
        
        // Send manually
        const result = await new Promise((resolve) => {
            const client = dgram.createSocket('udp4');
            let responseReceived = false;

            const timeout = setTimeout(() => {
                if (!responseReceived) {
                    responseReceived = true;
                    client.close();
                    resolve(null);
                }
            }, 5000);

            client.on('message', (msg, rinfo) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeout);
                    client.close();
                    
                    try {
                        const parsed = this.packetHandler.parsePacket(msg);
                        resolve(parsed);
                    } catch (error) {
                        resolve({ raw: msg, error: error.message });
                    }
                }
            });

            client.on('error', (err) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeout);
                    client.close();
                    resolve(null);
                }
            });

            client.send(timePacket, controllerInfo.port, controllerInfo.ip, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    client.close();
                    resolve(null);
                }
            });
        });
        
        if (result && result.functionId === 0x30) {
            this.log('Set time successful!', 'success');
        } else {
            this.log('Set time failed', 'error');
        }
    }

    async testCustomPacket() {
        this.log('=== Custom Packet Test ===');
        
        const ip = await this.question('Enter controller IP: ');
        const port = parseInt(await this.question('Enter controller port: '));
        const functionId = parseInt(await this.question('Enter function ID (hex, e.g., 94): '), 16);
        const serialNumber = parseInt(await this.question('Enter serial number (0 for discovery): ')) || 0;
        
        this.log(`Sending custom packet: Function 0x${functionId.toString(16)} to ${ip}:${port}`);
        
        const result = await this.sendPacketToController(ip, port, functionId, serialNumber);
        
        if (result) {
            this.log('Custom packet successful!', 'success');
        } else {
            this.log('Custom packet failed', 'error');
        }
    }

    async showMenu() {
        console.log('\n=== Manual Controller Test Menu ===');
        console.log('1. Test Discovery');
        console.log('2. Test Get Time');
        console.log('3. Test Set Time');
        console.log('4. Test Custom Packet');
        console.log('5. Exit');
        console.log('');
        
        return await this.question('Choose an option (1-5): ');
    }

    async run() {
        this.log('Manual Controller Test Tool', 'info');
        this.log('This tool allows you to manually test controller communication');
        this.log('');
        
        let controllerInfo = null;
        
        while (true) {
            const choice = await this.showMenu();
            
            switch (choice) {
                case '1':
                    controllerInfo = await this.testDiscovery();
                    break;
                    
                case '2':
                    await this.testGetTime(controllerInfo);
                    break;
                    
                case '3':
                    await this.testSetTime(controllerInfo);
                    break;
                    
                case '4':
                    await this.testCustomPacket();
                    break;
                    
                case '5':
                    this.log('Goodbye!');
                    this.rl.close();
                    return;
                    
                default:
                    this.log('Invalid choice. Please try again.', 'error');
            }
            
            await this.question('\nPress Enter to continue...');
        }
    }
}

// Main execution
if (require.main === module) {
    const tester = new ManualControllerTest();
    tester.run().catch(console.error);
}

module.exports = ManualControllerTest;
