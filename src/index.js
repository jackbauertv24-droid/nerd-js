#!/usr/bin/env node

import { Miner } from './miner.js';
import { logInfo, logError } from './utils/logger.js';
import os from 'os';

const args = process.argv.slice(2);

function parseArgs() {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--wallet' || arg === '-w') {
            options.wallet = args[++i];
        } else if (arg === '--pool' || arg === '-p') {
            options.host = args[++i];
        } else if (arg === '--port') {
            options.port = parseInt(args[++i], 10);
        } else if (arg === '--threads' || arg === '-t') {
            options.threads = parseInt(args[++i], 10);
        } else if (arg === '--password') {
            options.password = args[++i];
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        } else if (arg === '--version' || arg === '-v') {
            console.log('nerd-js v1.0.0');
            process.exit(0);
        }
    }
    
    return options;
}

function printHelp() {
    console.log(`
Usage: nerd-js [options]

Options:
  --wallet, -w <address>    Bitcoin wallet address (required)
  --pool, -p <host>         Pool host (default: public-pool.io)
  --port <port>             Pool port (default: 21496)
  --threads, -t <count>     Number of mining threads (default: CPU cores)
  --password <pass>         Pool password (default: x)
  --help, -h                Show this help
  --version, -v             Show version

Examples:
  nerd-js --wallet bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
  nerd-js -w bc1qxy2... -p pool.nerdminers.org --port 3333 -t 4
`);
}

function validateOptions(options) {
    if (!options.wallet) {
        logError('Wallet address is required. Use --wallet or -w');
        printHelp();
        process.exit(1);
    }
    
    if (options.threads && (options.threads < 1 || options.threads > os.cpus().length)) {
        logError(`Threads must be between 1 and ${os.cpus().length}`);
        process.exit(1);
    }
}

async function main() {
    const options = parseArgs();
    validateOptions(options);
    
    const miner = new Miner(options);
    
    process.on('SIGINT', async () => {
        logInfo('\nShutting down...');
        await miner.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await miner.stop();
        process.exit(0);
    });
    
    try {
        await miner.start();
    } catch (err) {
        logError(`Failed to start miner: ${err.message}`);
        process.exit(1);
    }
}

main();