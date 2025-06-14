#!/usr/bin/env node

/**
 * CLI Entry Point for Enhanced Controller Discovery
 */

const CLI = require('./index');

async function main() {
    const cli = new CLI();
    await cli.run(process.argv);
}

main().catch(error => {
    console.error('CLI Error:', error.message);
    process.exit(1);
});
