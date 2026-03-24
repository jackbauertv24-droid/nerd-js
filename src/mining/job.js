import { prepareMiningJob } from './block.js';
import { bitsToTarget, difficultyToTarget } from '../crypto/utils.js';

export class JobManager {
    constructor() {
        this.currentJob = null;
        this.extranonce1 = '';
        this.extranonce2Size = 4;
        this.difficulty = 0.0001;
        this.target = null;
    }
    
    setExtranonce(extranonce1, extranonce2Size) {
        this.extranonce1 = extranonce1;
        this.extranonce2Size = extranonce2Size;
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.target = difficultyToTarget(difficulty);
    }
    
    createJob(stratumJob) {
        const miningJob = prepareMiningJob(
            stratumJob,
            this.extranonce1,
            this.extranonce2Size
        );
        
        if (!this.target) {
            this.target = bitsToTarget(stratumJob.nbits);
        }
        
        this.currentJob = {
            ...miningJob,
            target: this.target,
            nbits: stratumJob.nbits,
            cleanJobs: stratumJob.cleanJobs
        };
        
        return this.currentJob;
    }
    
    getCurrentJob() {
        return this.currentJob;
    }
}