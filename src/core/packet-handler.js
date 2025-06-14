const dgram = require('dgram');

/**
 * Packet Handler for Controller Communication
 * Handles UDP packet creation, parsing, and BCD encoding/decoding
 */
class PacketHandler {
    constructor() {
        this.PACKET_SIZE = 64;
        this.CONTROLLER_PORT = 60000;
        this.TYPE_BYTE = 0x17;
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
     * Broadcast packet for discovery
     */
    async broadcastPacket(packet, timeout = 5000) {
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
                    '192.168.2.255',    // Added for your specific network
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
}

module.exports = PacketHandler;
