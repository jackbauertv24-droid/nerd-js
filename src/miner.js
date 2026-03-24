import { Worker } from 'worker_threads';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { StratumClient } from './stratum/client.js';
import { JobManager } from './mining/job.js';
import { logInfo, logSuccess, logError, logWarning, logShare, logJob, logConnection, logAuthorized, logDifficulty } from './utils/logger.js';
import { displayStats } from './utils/display.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Miner {
    constructor(options) {
        this.host = options.host || 'public-pool.io';
        this.port = options.port || 21496;
        this.wallet = options.wallet;
        this.password = options.password || 'x';
        this.threads = options.threads || os.cpus().length;
        
        this.stratumClient = null;
        this.jobManager = new JobManager();
        this.workers = [];
        this.currentJobId = null;
        
        this.stats = {
            hashRate: 0,
            totalHashes: 0,
            shares: 0,
            acceptedShares: 0,
            rejectedShares: 0,
            bestDiff: 0,
            difficulty: 0.0001,
            uptime: 0,
            wallet: this.wallet,
            pool: `${this.host}:${this.port}`,
            threads: this.threads
        };
        
        this.workerHashes = new Map();
        this.startTime = null;
        this.running = false;
        this.displayInterval = null;
    }
    
    async start() {
        if (!this.wallet) {
            throw new Error('Wallet address is required');
        }
        
        this.running = true;
        this.startTime = Date.now();
        
        this.displayInterval = setInterval(() => {
            this.stats.uptime = Date.now() - this.startTime;
            displayStats(this.stats);
        }, 5000);
        
        logConnection(this.host, this.port);
        
        this.stratumClient = new StratumClient({
            host: this.host,
            port: this.port,
            wallet: this.wallet,
            password: this.password
        });
        
        this.stratumClient.on('error', (err) => {
            logError(`Connection error: ${err.message}`);
            this.handleReconnect();
        });
        
        this.stratumClient.on('disconnected', () => {
            logWarning('Disconnected from pool');
            this.handleReconnect();
        });
        
        this.stratumClient.on('job', (job) => {
            this.handleJob(job);
        });
        
        this.stratumClient.on('difficulty', (difficulty) => {
            logDifficulty(difficulty);
            this.stats.difficulty = difficulty;
            this.jobManager.setDifficulty(difficulty);
            
            // Restart workers with new target if they're running
            if (this.workers.length > 0) {
                const currentJob = this.jobManager.getCurrentJob();
                if (currentJob) {
                    this.stopWorkers();
                    this.startWorkers(currentJob);
                }
            }
        });
        
        try {
            await this.stratumClient.connect();
            logSuccess('Connected to pool');
            
            const subResult = await this.stratumClient.subscribe();
            if (subResult) {
                this.jobManager.setExtranonce(subResult.extranonce1, subResult.extranonce2Size);
                logInfo(`Extranonce1: ${subResult.extranonce1}, Size: ${subResult.extranonce2Size}`);
            }
            
            const authorized = await this.stratumClient.authorize();
            if (authorized) {
                logAuthorized(this.wallet);
            } else {
                throw new Error('Authorization failed');
            }
            
            await this.stratumClient.suggestDifficulty(0.0001);
            
        } catch (err) {
            logError(`Failed to connect: ${err.message}`);
            await this.handleReconnect();
        }
    }
    
    async handleReconnect() {
        this.stopWorkers();
        
        if (!this.running) return;
        
        logWarning('Reconnecting in 5 seconds...');
        await this.sleep(5000);
        
        try {
            await this.stratumClient.connect();
            logSuccess('Reconnected to pool');
            
            await this.stratumClient.subscribe();
            const authorized = await this.stratumClient.authorize();
            if (authorized) {
                logAuthorized(this.wallet);
            }
        } catch (err) {
            logError(`Reconnect failed: ${err.message}`);
            await this.handleReconnect();
        }
    }
    
    handleJob(job) {
        logJob(job.jobId, job.prevHash);
        
        this.stopWorkers();
        
        const miningJob = this.jobManager.createJob(job);
        this.currentJobId = job.jobId;
        
        // Small delay to allow difficulty message to arrive
        setTimeout(() => {
            // Refresh job target in case difficulty was updated
            const currentJob = this.jobManager.getCurrentJob();
            if (currentJob && currentJob.jobId === job.jobId) {
                this.startWorkers(currentJob);
            }
        }, 100);
    }
    
    startWorkers(job) {
        this.workerHashes.clear();
        
        const maxNonce = 0xFFFFFFFF;
        const nonceRange = Math.floor(maxNonce / this.threads);
        
        for (let i = 0; i < this.threads; i++) {
            const nonceStart = i * nonceRange;
            const nonceEnd = i === this.threads - 1 ? maxNonce : (i + 1) * nonceRange;
            
            const worker = new Worker(join(__dirname, 'mining', 'worker.js'));
            const workerId = i;
            worker.workerId = workerId;
            
            worker.on('message', (msg) => {
                this.handleWorkerMessage(msg, worker, workerId);
            });
            
            worker.on('error', (err) => {
                logError(`Worker error: ${err.message}`);
            });
            
            worker.postMessage({
                type: 'start',
                data: {
                    header: job.header,
                    target: job.target,
                    nonceStart,
                    nonceEnd,
                    jobId: job.jobId
                }
            });
            
            this.workers.push(worker);
        }
    }
    
    stopWorkers() {
        for (const worker of this.workers) {
            worker.postMessage({ type: 'stop' });
            worker.terminate();
        }
        this.workers = [];
    }
    
    async handleWorkerMessage(msg, worker, workerId) {
        if (msg.type === 'share') {
            const { nonceHex, difficulty, jobId } = msg.data;
            
            this.stats.shares++;
            
            if (difficulty > this.stats.bestDiff) {
                this.stats.bestDiff = difficulty;
            }
            
            const job = this.jobManager.getCurrentJob();
            if (job) {
                try {
                    const result = await this.stratumClient.submit(
                        job.jobId,
                        job.extranonce2,
                        parseInt(job.ntime, 16),
                        nonceHex
                    );
                    
                    if (result.accepted) {
                        logShare(difficulty, true);
                        this.stats.acceptedShares++;
                    } else {
                        logError(`Share rejected: ${JSON.stringify(result.error)}`);
                        this.stats.rejectedShares++;
                    }
                } catch (err) {
                    logError(`Submit failed: ${err.message}`);
                    this.stats.rejectedShares++;
                } finally {
                    this.stopWorkers();
                    const newJob = this.jobManager.regenerateCurrentJob();
                    if (newJob && this.running) {
                        this.startWorkers(newJob);
                    }
                }
            }
        } else if (msg.type === 'progress') {
            const { hashRate, hashes } = msg.data;
            this.stats.hashRate = hashRate * this.threads;
            
            const lastHashes = this.workerHashes.get(workerId) || 0;
            this.stats.totalHashes += hashes - lastHashes;
            this.workerHashes.set(workerId, hashes);
        } else if (msg.type === 'complete') {
            const { totalHashes, avgHashRate } = msg.data;
        }
    }
    
    async stop() {
        this.running = false;
        
        if (this.displayInterval) {
            clearInterval(this.displayInterval);
        }
        
        this.stopWorkers();
        
        if (this.stratumClient) {
            this.stratumClient.disconnect();
        }
        
        logInfo('Miner stopped');
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}