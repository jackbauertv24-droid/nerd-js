import chalk from 'chalk';
import { formatHashRate, formatUptime } from './logger.js';

export function displayStats(stats) {
    const {
        hashRate,
        totalHashes,
        shares,
        acceptedShares,
        rejectedShares,
        bestDiff,
        difficulty,
        uptime,
        wallet,
        pool,
        threads
    } = stats;
    
    console.clear();
    
    const width = 62;
    const border = '═'.repeat(width);
    const line = '─'.repeat(width);
    
    console.log(chalk.cyan('╔' + border + '╗'));
    console.log(chalk.cyan('║') + center('NerdJS v1.0.0 - Node.js Bitcoin Solo Miner', width) + chalk.cyan('║'));
    console.log(chalk.cyan('╠' + border + '╣'));
    console.log(chalk.cyan('║') + pad(`  Pool: ${pool}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Wallet: ${wallet}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Threads: ${threads}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('╠' + border + '╣'));
    console.log(chalk.cyan('║') + pad(`  Hashrate: ${formatHashRate(hashRate)}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Total Hashes: ${formatNumber(totalHashes)}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Shares: ${acceptedShares}/${shares} accepted` + 
        (rejectedShares > 0 ? chalk.red(` (${rejectedShares} rejected)`) : ''), width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Best Difficulty: ${bestDiff.toFixed(8)}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Pool Difficulty: ${difficulty}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + pad(`  Uptime: ${formatUptime(uptime)}`, width) + chalk.cyan('║'));
    console.log(chalk.cyan('╚' + border + '╝'));
    console.log();
}

function center(text, width) {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text + ' '.repeat(Math.max(0, width - text.length - padding));
}

function pad(text, width) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    const visibleLength = stripAnsi(text).length;
    return text + ' '.repeat(Math.max(0, width - visibleLength));
}

function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function formatNumber(num) {
    if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'G';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'k';
    } else {
        return num.toString();
    }
}