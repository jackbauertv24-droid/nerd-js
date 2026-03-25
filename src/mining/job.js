import { prepareMiningJob } from './block.js';
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
        
        // Update current job's target if it exists
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
        
        // Use pool target if available, otherwise compute from nbits
        const target = this.poolTarget || bitsToTarget(stratumJob.nbits);
        
        this.currentJob = {
            ...miningJob,
            target: target,
            nbits: stratumJob.nbits,
            cleanJobs: stratumJob.cleanJobs
        };
        
        return this.currentJob;
    }
    
    getCurrentJob() {
        return this.currentJob;
    }
}