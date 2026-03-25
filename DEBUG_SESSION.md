# NerdJS Debug Session - March 25, 2026

## Problem

Shares consistently rejected with "Difficulty too low" error despite local difficulty calculation showing shares exceed pool minimum (e.g., 0.002 > 0.0001).

## Session Work

### 1. Worker Syntax Fix

Fixed merge conflict markers in `src/mining/worker.js`:
```javascript
// Before (broken)
<<<<<<< HEAD
            
=======

>>>>>>> de206fb99a95235fba7a6952b342fce8a80632f1
// After (fixed) - removed the conflict markers
```

### 2. ntime Submission Fix

**Issue Found**: The miner was sending current timestamp (`Math.floor(Date.now() / 1000)`) as ntime to the pool.

**Problem**: When the pool reconstructs the block to verify the share, it uses the original job ntime (from mining.notify), not the submitted ntime. This causes hash mismatch.

**Fix** (`src/miner.js`):
```javascript
// Before (incorrect)
const currentNtime = Math.floor(Date.now() / 1000);
const result = await this.stratumClient.submit(
    job.jobId,
    job.extranonce2,
    currentNtime,  // WRONG - using current time
    nonceHex
);

// After (correct)
const result = await this.stratumClient.submit(
    job.jobId,
    job.extranonce2,
    job.ntime,  // CORRECT - use original job ntime
    nonceHex
);
```

### 3. Job Object Update

Added `ntime` to job storage so it's available for submission (`src/mining/job.js`):
```javascript
this.currentJob = {
    ...miningJob,
    target: target,
    nbits: stratumJob.nbits,
    ntime: stratumJob.ntime,  // Added this line
    // ...
};
```

## Root Cause Still Under Investigation

Despite these fixes, shares are still rejected with "Difficulty too low". This indicates:

1. **Hash computation mismatch** - The pool computes a different hash when reconstructing the block
2. **Block construction error** - One or more fields (version, prevHash, merkleRoot, nbits, nonce) may have byte order issues
3. **Coinbase mismatch** - The pool may compute a different coinbase hash

## Verified Working Components

- ✅ Double SHA256 implementation matches genesis block
- ✅ Midstate optimization produces correct hashes
- ✅ Difficulty calculation returns correct values
- ✅ Target conversion (bits → target) works correctly
- ✅ Share difficulty check passes locally

## Files Modified

- `src/miner.js` - Use original job ntime for submission
- `src/mining/job.js` - Store ntime in job object  
- `src/mining/worker.js` - Remove merge conflict markers

## Next Steps

To isolate the remaining issue:

1. Create a test that uses a known-working job from a successful NerdMiner
2. Log all submitted parameters to compare with reference
3. Test with a different mining pool (e.g., pool.nerdminers.org)
4. Verify block header byte order against Stratum V1 specification
