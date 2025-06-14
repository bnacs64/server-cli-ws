const { Command } = require('commander');
const inquirer = require('inquirer');
const ControllerAPI = require('../core/controller-api');

/**
 * CLI Interface for Controller Management
 * Provides command-line interface for all controller operations
 */
class CLI {
    constructor() {
        this.api = new ControllerAPI();
        this.program = new Command();
        this.setupCommands();
    }

    setupCommands() {
        this.program
            .name('controller-cli')
            .description('Network-enabled hardware controller management CLI')
            .version('1.0.0');

        // Discovery command
        this.program
            .command('discover')
            .description('Discover controllers on the network')
            .option('-t, --timeout <seconds>', 'Discovery timeout in seconds', '5')
            .action(async (options) => {
                await this.handleDiscover(parseInt(options.timeout) * 1000);
            });

        // List command
        this.program
            .command('list')
            .description('List all saved controllers')
            .option('-f, --format <format>', 'Output format (table|json|csv)', 'table')
            .action(async (options) => {
                await this.handleList(options.format);
            });

        // Get command
        this.program
            .command('get <setting>')
            .description('Get a setting from a controller (time|network|server)')
            .option('-c, --controller <serial>', 'Controller serial number')
            .action(async (setting, options) => {
                await this.handleGet(setting, options.controller);
            });

        // Set command
        this.program
            .command('set <setting>')
            .description('Set a setting on a controller (time|network|server)')
            .option('-c, --controller <serial>', 'Controller serial number')
            .action(async (setting, options) => {
                await this.handleSet(setting, options.controller);
            });

        // Remove command
        this.program
            .command('remove <serial>')
            .description('Remove a controller from saved list')
            .action(async (serial) => {
                await this.handleRemove(serial);
            });

        // Clear command
        this.program
            .command('clear')
            .description('Clear all saved controllers')
            .option('-f, --force', 'Force clear without confirmation')
            .action(async (options) => {
                await this.handleClear(options.force);
            });

        // Interactive mode
        this.program
            .command('interactive')
            .alias('i')
            .description('Start interactive mode')
            .action(async () => {
                await this.handleInteractive();
            });
    }

    async handleDiscover(timeout) {
        try {
            console.log(`🔍 Discovering controllers (timeout: ${timeout/1000}s)...`);
            
            const controllers = await this.api.discoverControllers(timeout);
            
            if (controllers.length === 0) {
                console.log('❌ No controllers found on the network.');
                return;
            }

            console.log(`✅ Found ${controllers.length} controller(s):`);
            console.table(controllers.map(c => ({
                'Serial Number': c.serialNumber,
                'IP Address': c.ip,
                'MAC Address': c.macAddress,
                'Driver Version': c.driverVersion,
                'Release Date': c.driverReleaseDate
            })));

        } catch (error) {
            console.error('❌ Discovery failed:', error.message);
            process.exit(1);
        }
    }

    async handleList(format) {
        try {
            const controllers = await this.api.getSavedControllers();
            
            if (controllers.length === 0) {
                console.log('📝 No controllers saved. Run "discover" command first.');
                return;
            }

            switch (format.toLowerCase()) {
                case 'json':
                    console.log(JSON.stringify(controllers, null, 2));
                    break;
                
                case 'csv':
                    const csvData = await this.api.configManager.exportControllers('csv');
                    console.log(csvData);
                    break;
                
                case 'table':
                default:
                    console.log(`📋 Saved Controllers (${controllers.length}):`);
                    console.table(controllers.map(c => ({
                        'Serial Number': c.serialNumber,
                        'IP Address': c.ip,
                        'MAC Address': c.macAddress,
                        'Driver Version': c.driverVersion,
                        'Last Seen': new Date(c.lastSeen).toLocaleString()
                    })));
                    break;
            }

        } catch (error) {
            console.error('❌ Failed to list controllers:', error.message);
            process.exit(1);
        }
    }

    async handleGet(setting, controllerSerial) {
        try {
            const controller = await this.selectController(controllerSerial);
            if (!controller) return;

            console.log(`📡 Getting ${setting} from controller ${controller.serialNumber}...`);

            switch (setting.toLowerCase()) {
                case 'time':
                    const timeResult = await this.api.getControllerTime(controller);
                    console.log('✅ Controller Time:', timeResult.time.toLocaleString());
                    break;

                case 'server':
                    const serverResult = await this.api.getReceivingServer(controller);
                    console.log('✅ Receiving Server Configuration:');
                    console.log(`   Server IP: ${serverResult.serverIp}`);
                    console.log(`   Port: ${serverResult.port}`);
                    console.log(`   Upload Interval: ${serverResult.uploadInterval}s`);
                    console.log(`   Upload Enabled: ${serverResult.uploadEnabled}`);
                    break;

                case 'network':
                    console.log('✅ Network Configuration:');
                    console.log(`   IP Address: ${controller.ip}`);
                    console.log(`   Subnet Mask: ${controller.subnetMask}`);
                    console.log(`   Gateway: ${controller.gateway}`);
                    break;

                default:
                    console.error('❌ Invalid setting. Use: time, network, or server');
                    process.exit(1);
            }

        } catch (error) {
            console.error(`❌ Failed to get ${setting}:`, error.message);
            process.exit(1);
        }
    }

    async handleSet(setting, controllerSerial) {
        try {
            const controller = await this.selectController(controllerSerial);
            if (!controller) return;

            switch (setting.toLowerCase()) {
                case 'time':
                    await this.setTime(controller);
                    break;

                case 'network':
                    await this.setNetwork(controller);
                    break;

                case 'server':
                    await this.setServer(controller);
                    break;

                default:
                    console.error('❌ Invalid setting. Use: time, network, or server');
                    process.exit(1);
            }

        } catch (error) {
            console.error(`❌ Failed to set ${setting}:`, error.message);
            process.exit(1);
        }
    }

    async setTime(controller) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'timeOption',
                message: 'Set time to:',
                choices: [
                    { name: 'Current system time', value: 'current' },
                    { name: 'Custom time', value: 'custom' }
                ]
            }
        ]);

        let newTime;
        if (answers.timeOption === 'current') {
            newTime = new Date();
        } else {
            const timeAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'datetime',
                    message: 'Enter date and time (YYYY-MM-DD HH:MM:SS):',
                    validate: (input) => {
                        const date = new Date(input);
                        return !isNaN(date.getTime()) || 'Please enter a valid date and time';
                    }
                }
            ]);
            newTime = new Date(timeAnswers.datetime);
        }

        console.log(`⏰ Setting controller time to: ${newTime.toLocaleString()}`);
        const result = await this.api.setControllerTime(controller, newTime);
        console.log('✅ Time set successfully!');
    }

    async setNetwork(controller) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'ip',
                message: 'Enter new IP address:',
                default: controller.ip,
                validate: this.validateIP
            },
            {
                type: 'input',
                name: 'subnetMask',
                message: 'Enter subnet mask:',
                default: controller.subnetMask,
                validate: this.validateIP
            },
            {
                type: 'input',
                name: 'gateway',
                message: 'Enter gateway:',
                default: controller.gateway,
                validate: this.validateIP
            }
        ]);

        console.log('🌐 Setting network configuration...');
        console.log('⚠️  Controller will restart after this operation.');
        
        const confirm = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Continue?',
                default: false
            }
        ]);

        if (confirm.proceed) {
            const result = await this.api.setControllerNetworkConfig(controller, answers);
            console.log('✅ Network configuration sent. Controller is restarting...');
        } else {
            console.log('❌ Operation cancelled.');
        }
    }

    async setServer(controller) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'serverIp',
                message: 'Enter receiving server IP address:',
                validate: this.validateIP
            },
            {
                type: 'number',
                name: 'port',
                message: 'Enter server port:',
                default: 9001,
                validate: (input) => {
                    return (input >= 1 && input <= 65535) || 'Port must be between 1 and 65535';
                }
            },
            {
                type: 'number',
                name: 'uploadInterval',
                message: 'Enter upload interval in seconds (0 to disable):',
                default: 0,
                validate: (input) => {
                    return (input >= 0 && input <= 255) || 'Interval must be between 0 and 255';
                }
            }
        ]);

        console.log('📡 Setting receiving server configuration...');
        const result = await this.api.setReceivingServer(controller, answers);
        console.log('✅ Server configuration set successfully!');
    }

    validateIP(input) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(input) || 'Please enter a valid IP address';
    }

    async selectController(serialNumber) {
        if (serialNumber) {
            const controller = await this.api.getControllerBySerial(parseInt(serialNumber));
            if (!controller) {
                console.error(`❌ Controller with serial number ${serialNumber} not found.`);
                return null;
            }
            return controller;
        }

        const controllers = await this.api.getSavedControllers();
        if (controllers.length === 0) {
            console.error('❌ No controllers found. Run "discover" command first.');
            return null;
        }

        if (controllers.length === 1) {
            return controllers[0];
        }

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'controller',
                message: 'Select a controller:',
                choices: controllers.map(c => ({
                    name: `${c.serialNumber} (${c.ip}) - ${c.macAddress}`,
                    value: c
                }))
            }
        ]);

        return answer.controller;
    }

    async handleRemove(serial) {
        const serialNumber = parseInt(serial);
        const controller = await this.api.getControllerBySerial(serialNumber);
        
        if (!controller) {
            console.error(`❌ Controller with serial number ${serialNumber} not found.`);
            return;
        }

        const confirm = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Remove controller ${serialNumber} (${controller.ip})?`,
                default: false
            }
        ]);

        if (confirm.proceed) {
            await this.api.removeController(serialNumber);
            console.log('✅ Controller removed successfully.');
        } else {
            console.log('❌ Operation cancelled.');
        }
    }

    async handleClear(force) {
        if (!force) {
            const confirm = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Clear all saved controllers?',
                    default: false
                }
            ]);

            if (!confirm.proceed) {
                console.log('❌ Operation cancelled.');
                return;
            }
        }

        await this.api.clearSavedControllers();
        console.log('✅ All controllers cleared.');
    }

    async handleInteractive() {
        console.log('🎛️  Interactive Controller Management');
        console.log('Type "exit" to quit interactive mode.\n');

        while (true) {
            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '🔍 Discover controllers', value: 'discover' },
                        { name: '📋 List saved controllers', value: 'list' },
                        { name: '📡 Get controller setting', value: 'get' },
                        { name: '⚙️  Set controller setting', value: 'set' },
                        { name: '🗑️  Remove controller', value: 'remove' },
                        { name: '🧹 Clear all controllers', value: 'clear' },
                        { name: '🚪 Exit', value: 'exit' }
                    ]
                }
            ]);

            if (answer.action === 'exit') {
                console.log('👋 Goodbye!');
                break;
            }

            try {
                switch (answer.action) {
                    case 'discover':
                        await this.handleDiscover(5000);
                        break;
                    case 'list':
                        await this.handleList('table');
                        break;
                    case 'get':
                        const getSetting = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'setting',
                                message: 'Which setting to get?',
                                choices: ['time', 'network', 'server']
                            }
                        ]);
                        await this.handleGet(getSetting.setting);
                        break;
                    case 'set':
                        const setSetting = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'setting',
                                message: 'Which setting to set?',
                                choices: ['time', 'network', 'server']
                            }
                        ]);
                        await this.handleSet(setSetting.setting);
                        break;
                    case 'remove':
                        const controller = await this.selectController();
                        if (controller) {
                            await this.handleRemove(controller.serialNumber.toString());
                        }
                        break;
                    case 'clear':
                        await this.handleClear(false);
                        break;
                }
            } catch (error) {
                console.error('❌ Error:', error.message);
            }

            console.log(); // Add spacing
        }
    }

    async run(args) {
        await this.program.parseAsync(args);
    }
}

module.exports = CLI;
