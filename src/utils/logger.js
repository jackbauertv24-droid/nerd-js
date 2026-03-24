import chalk from 'chalk';

export function logInfo(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(chalk.gray(`[${timestamp}]`) + ' ' + message);
}

export function logSuccess(message) {
    logInfo(chalk.green('✓ ' + message));
}

export function logError(message) {
    logInfo(chalk.red('✗ ' + message));
}

export function logWarning(message) {
    logInfo(chalk.yellow('⚠ ' + message));
}

export function logShare(difficulty, accepted = true) {
    if (accepted) {
        logInfo(chalk.green('Share accepted!') + chalk.gray(` Diff: ${difficulty.toFixed(8)}`));
    } else {
        logInfo(chalk.red('Share rejected!') + chalk.gray(` Diff: ${difficulty.toFixed(8)}`));
    }
}

export function logJob(jobId, prevHash) {
    logInfo(chalk.cyan('New job #' + jobId.slice(0, 8)) + chalk.gray(` prevHash: ${prevHash.slice(0, 12)}...`));
}

export function logConnection(host, port) {
    logInfo(chalk.blue('Connecting to') + ` ${host}:${port}`);
}

export function logAuthorized(wallet) {
    logSuccess(`Authorized wallet: ${wallet.slice(0, 20)}...${wallet.slice(-8)}`);
}

export function logDifficulty(difficulty) {
    logInfo(chalk.magenta('Difficulty set to:') + ` ${difficulty}`);
}

export function logHashRate(hashRate) {
    const rate = formatHashRate(hashRate);
    logInfo(chalk.cyan('Hashrate:') + ` ${rate}`);
}

export function formatHashRate(hashRate) {
    if (hashRate >= 1e9) {
        return (hashRate / 1e9).toFixed(2) + ' GH/s';
    } else if (hashRate >= 1e6) {
        return (hashRate / 1e6).toFixed(2) + ' MH/s';
    } else if (hashRate >= 1e3) {
        return (hashRate / 1e3).toFixed(2) + ' kH/s';
    } else {
        return hashRate.toFixed(2) + ' H/s';
    }
}

export function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}