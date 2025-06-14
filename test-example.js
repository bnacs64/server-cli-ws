// Example test script to demonstrate the Controller Management System
// This file shows how to use the core API without requiring external dependencies

const ControllerAPI = require('./src/core/controller-api');

async function testExample() {
    console.log('🧪 Controller Management System - Test Example');
    console.log('===============================================\n');

    try {
        const api = new ControllerAPI();

        // Test 1: Load saved controllers
        console.log('📋 Loading saved controllers...');
        const controllers = await api.getSavedControllers();
        console.log(`Found ${controllers.length} saved controller(s)\n`);

        // Test 2: BCD conversion test
        console.log('🔢 Testing BCD conversion...');
        const testDate = new Date('2024-01-15 14:30:45');
        const bcdData = api.packetHandler.dateToBCD(testDate);
        console.log('Original date:', testDate.toISOString());
        console.log('BCD format:', bcdData);
        
        const convertedBack = api.packetHandler.bcdToDate(bcdData);
        console.log('Converted back:', convertedBack.toISOString());
        console.log('Conversion successful:', testDate.getTime() === convertedBack.getTime() ? '✅' : '❌');
        console.log();

        // Test 3: Packet creation test
        console.log('📦 Testing packet creation...');
        const packet = api.packetHandler.createPacket(0x94, 223000123);
        console.log('Discovery packet created:', packet.length === 64 ? '✅' : '❌');
        console.log('Packet size:', packet.length, 'bytes');
        console.log('Function ID:', packet[1] === 0x94 ? '✅' : '❌');
        console.log();

        // Test 4: IP conversion test
        console.log('🌐 Testing IP conversion...');
        const testIp = '192.168.1.100';
        const ipBytes = api.packetHandler.ipToBytes(testIp);
        const convertedIp = api.packetHandler.bytesToIp(ipBytes);
        console.log('Original IP:', testIp);
        console.log('IP bytes:', ipBytes);
        console.log('Converted back:', convertedIp);
        console.log('IP conversion successful:', testIp === convertedIp ? '✅' : '❌');
        console.log();

        // Test 5: Serial number conversion test
        console.log('🔢 Testing serial number conversion...');
        const testSerial = 223000123;
        const serialBytes = api.packetHandler.serialNumberToBytes(testSerial);
        const convertedSerial = api.packetHandler.bytesToSerialNumber(serialBytes);
        console.log('Original serial:', testSerial);
        console.log('Serial bytes:', serialBytes);
        console.log('Converted back:', convertedSerial);
        console.log('Serial conversion successful:', testSerial === convertedSerial ? '✅' : '❌');
        console.log();

        console.log('🎉 All core functionality tests completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Install Node.js if not already installed');
        console.log('2. Run "npm install" to install dependencies');
        console.log('3. Start CLI mode: "node app.js cli"');
        console.log('4. Start server mode: "node app.js server"');
        console.log('5. Try discovery: "node app.js cli discover"');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testExample();
}

module.exports = testExample;
