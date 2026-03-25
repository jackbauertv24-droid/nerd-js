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

## 4. Critical Discovery: Nonce Byte Order Bug

**Genesis Block Testing** revealed the nonce is stored in **big-endian** format in the block header, not little-endian.

### Test Case
```javascript
// Genesis block has nonce 0x1dac2b7c at offset 76
const genesis = Buffer.from('...1dac2b7c', 'hex');
const nonce = 0x1dac2b7c;

// WRONG (current implementation):
header.writeUInt32LE(nonce, 76);  // produces 7c2bac1d at offset 76

// CORRECT:
header.writeUInt32BE(nonce, 76);  // produces 1dac2b7c at offset 76
```

### Files Needing Fix

| File | Location | Current (Wrong) | Should Be |
|------|----------|-----------------|-----------|
| `src/mining/worker.js` | `last16Buffer.writeUInt32LE(nonce, 12)` | LE | BE |
| `src/mining/block.js` | `uint32LE(nonce)` in `buildBlockHeader` | LE | BE |

### Why This Matters

The nonce at offset 76 in the 80-byte block header must match what the pool expects. Writing it in wrong byte order produces a different hash, causing the pool to reject shares as "Difficulty too low" because the reconstructed hash doesn't match the submitted hash.

## Working Commit Reference

Commit `5b164a2` was the last known working version. It fixed the original "Difficulty too low" by not reversing version/ntime/nbits since they're already sent as little-endian by stratum.

## Files Modified (This Session)

- `src/miner.js` - Use original job ntime for submission
- `src/mining/job.js` - Store ntime in job object  
- `src/mining/worker.js` - Remove merge conflict markers
- `src/stratum/client.js` - Cleanup

## Next Steps

1. **Fix nonce byte order**: Change `writeUInt32LE` → `writeUInt32BE` in worker.js and block.js
2. **Verify with genesis block**: Test produces correct genesis block hash
3. **Test against pool**: Submit shares and verify acceptance
4. **DO NOT** change anything else until this is verified working
