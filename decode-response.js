#!/usr/bin/env node

// Decode the actual controller response to understand the format

const rawHex = '179400009cca3819c0a80242ffffff00c0a8020100571938ca9c0662202109150000000000000000000000000000000000000000000000000000000000000000';
const buffer = Buffer.from(rawHex, 'hex');

console.log('🔍 Analyzing Controller Response');
console.log('================================');
console.log(`Raw hex: ${rawHex}`);
console.log(`Buffer length: ${buffer.length} bytes`);
console.log('');

// Parse packet header
console.log('📦 Packet Header:');
console.log(`  Byte 0 (Type): 0x${buffer[0].toString(16).padStart(2, '0')} (${buffer[0]})`);
console.log(`  Byte 1 (Function): 0x${buffer[1].toString(16).padStart(2, '0')} (${buffer[1]})`);
console.log(`  Bytes 2-3 (Reserved): 0x${buffer.readUInt16LE(2).toString(16).padStart(4, '0')}`);
console.log(`  Bytes 4-7 (Serial): ${buffer.readUInt32LE(4)} (0x${buffer.readUInt32LE(4).toString(16)})`);
console.log('');

// Parse data section (bytes 8-39)
const data = Array.from(buffer.slice(8, 40));
console.log('📋 Data Section (bytes 8-39):');
console.log(`  Raw data: ${data.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
console.log('');

// Parse according to SDK specification
console.log('🌐 Network Information:');
const ip = [data[0], data[1], data[2], data[3]].join('.');
const subnet = [data[4], data[5], data[6], data[7]].join('.');
const gateway = [data[8], data[9], data[10], data[11]].join('.');
console.log(`  IP Address (bytes 0-3): ${ip}`);
console.log(`  Subnet Mask (bytes 4-7): ${subnet}`);
console.log(`  Gateway (bytes 8-11): ${gateway}`);
console.log('');

console.log('🔧 Hardware Information:');
const mac = data.slice(12, 18).map(b => b.toString(16).padStart(2, '0')).join(':');
console.log(`  MAC Address (bytes 12-17): ${mac}`);
console.log('');

console.log('💾 Driver Information:');
console.log(`  Bytes 18-19 (raw): 0x${data[18].toString(16).padStart(2, '0')} 0x${data[19].toString(16).padStart(2, '0')}`);
console.log(`  Bytes 20-23 (raw): 0x${data[20].toString(16).padStart(2, '0')} 0x${data[21].toString(16).padStart(2, '0')} 0x${data[22].toString(16).padStart(2, '0')} 0x${data[23].toString(16).padStart(2, '0')}`);

// Try different interpretations of driver version
console.log('');
console.log('🔢 Driver Version Analysis:');
console.log(`  Bytes 18-19 as decimal: ${data[18]}.${data[19]}`);
console.log(`  Bytes 18-19 as BCD: ${bcdToDecimal(data[19])}.${bcdToDecimal(data[18])}`);
console.log(`  Bytes 18-19 reversed BCD: ${bcdToDecimal(data[18])}.${bcdToDecimal(data[19])}`);

// Try different interpretations of date
console.log('');
console.log('📅 Release Date Analysis:');
console.log(`  Bytes 20-23 as decimal: ${data[20]}-${data[21]}-${data[22]}-${data[23]}`);
console.log(`  Bytes 20-23 as BCD: ${bcdToDecimal(data[20])}-${bcdToDecimal(data[21])}-${bcdToDecimal(data[22])}-${bcdToDecimal(data[23])}`);

// Try interpreting as YYYYMMDD
const year = bcdToDecimal(data[21]) * 100 + bcdToDecimal(data[20]);
const month = bcdToDecimal(data[22]);
const day = bcdToDecimal(data[23]);
console.log(`  As YYYYMMDD: ${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);

// Try different byte order
const year2 = bcdToDecimal(data[23]) * 100 + bcdToDecimal(data[22]);
const month2 = bcdToDecimal(data[21]);
const day2 = bcdToDecimal(data[20]);
console.log(`  Reversed order: ${year2}-${month2.toString().padStart(2, '0')}-${day2.toString().padStart(2, '0')}`);

console.log('');
console.log('🎯 Recommendations:');
console.log('1. Controller IP is actually 192.168.2.66 (as expected)');
console.log('2. Controller responds from 192.168.2.120 (might be NAT or different interface)');
console.log('3. Driver version needs correct BCD interpretation');
console.log('4. The controller IS working - just need to fix parsing');

function bcdToDecimal(bcd) {
    return bcd - Math.floor(bcd / 16) * 6;
}
