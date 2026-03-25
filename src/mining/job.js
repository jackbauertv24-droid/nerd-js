import { prepareMiningJob, incrementExtranonce2, buildBlockHeader, computeMerkleRoot, buildCoinbase } from './block.js';
import { bitsToTarget, difficultyToTarget } from '../crypto/utils.js';

export class JobManager {
    constructor() {
        this.currentJob = null;
        this.extranonce1 = '';
        this.extranonce2Size = 4;
        this.difficulty = 0.0001;
        this.poolTarget = null;
    }
    
    setExtranonce(extranonce1, extranonce2Size) {
        this.extranonce1 = extranonce1;
        this.extranonce2Size = extranonce2Size;
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.poolTarget = difficultyToTarget(difficulty);
        
        if (this.currentJob) {
            this.currentJob.target = this.poolTarget;
        }
    }
    
    createJob(stratumJob) {
        const miningJob = prepareMiningJob(
            stratumJob,
            this.extranonce1,
            this.extranonce2Size
        );
        
        const target = this.poolTarget || bitsToTarget(stratumJob.nbits);
        
        this.currentJob = {
            ...miningJob,
            target: target,
            nbits: stratumJob.nbits,
            cleanJobs: stratumJob.cleanJobs,
            merkleBranch: stratumJob.merkleBranch,
            coinb1: stratumJob.coinb1,
            coinb2: stratumJob.coinb2,
            version: stratumJob.version,
            prevHash: stratumJob.prevHash
        };
        
        return this.currentJob;
    }
    
    getCurrentJob() {
        return this.currentJob;
    }

    regenerateCurrentJob() {
        if (!this.currentJob) return null;
        
        this.currentJob.extranonce2 = incrementExtranonce2(this.currentJob.extranonce2);
        
        const coinbase = buildCoinbase(
            this.currentJob.coinb1,
            this.extranonce1,
            this.currentJob.extranonce2,
            this.currentJob.coinb2
        );
        
        const merkleRoot = computeMerkleRoot(coinbase, this.currentJob.merkleBranch);
        
        const headerTemplate = buildBlockHeader(
            this.currentJob.version,
            this.currentJob.prevHash,
            merkleRoot,
            this.currentJob.ntime,
            this.currentJob.nbits,
            0
        );
        
        this.currentJob.merkleRoot = merkleRoot;
        this.currentJob.header = headerTemplate;
        this.currentJob.coinbase = coinbase;
        
        return this.currentJob;
    }
}