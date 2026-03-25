# NerdJS Debug Session - March 25, 2026

## Problem

Shares consistently rejected with "Difficulty too low" error despite local difficulty calculation showing shares exceed pool minimum (e.g., 0.002 > 0.0001).

## Root Cause Identified

**Nonce byte order bug** - The nonce was being written in little-endian format when it should be big-endian in the block header.

## Findings

### 1. Worker Syntax Fix

Fixed merge conflict markers in `src/mining/worker.js` that broke the code:
```javascript
// Removed broken conflict markers
<<<<<<< HEAD
=======
>>>>>>> de206fb99a95235fba7a6952b342fce8a80632f1
```

### 2. ntime Submission Fix

**Issue**: The miner was sending current timestamp instead of original job ntime.

**Problem**: When the pool reconstructs the block to verify the share, it uses the original job ntime (from mining.notify). Sending a different ntime causes hash mismatch.

**Fix** (`src/miner.js`):
```javascript
// Before (incorrect)
const currentNtime = Math.floor(Date.now() / 1000);
const result = await this.stratumClient.submit(job.jobId, job.extranonce2, currentNtime, nonceHex);

// After (correct)
const result = await this.stratumClient.submit(job.jobId, job.extranonce2, job.ntime, nonceHex);
```

### 3. Job Object Update

Added `ntime` to job storage (`src/mining/job.js`):
```javascript
this.currentJob = {
    ...miningJob,
    target: target,
    nbits: stratumJob.nbits,
    ntime: stratumJob.ntime,  // Added this line
};
```

### 4. Critical Discovery: Nonce Byte Order Bug

**Genesis Block Testing** revealed the nonce is stored in **big-endian** format in the block header, not little-endian.

#### Test Case
```javascript
// Genesis block has nonce 0x1dac2b7c at offset 76
const nonce = 0x1dac2b7c;

// WRONG (current implementation):
header.writeUInt32LE(nonce, 76);  // produces 7c2bac1d at offset 76

// CORRECT:
header.writeUInt32BE(nonce, 76);  // produces 1dac2b7c at offset 76
```

#### Files Needing Fix

| File | Location | Current (Wrong) | Should Be |
|------|----------|-----------------|-----------|
| `src/mining/worker.js` | `last16Buffer.writeUInt32LE(nonce, 12)` | LE | BE |
| `src/mining/block.js` | `uint32LE(nonce)` in `buildBlockHeader` | LE | BE |

#### Why This Matters

The nonce at offset 76 in the 80-byte block header must match what the pool expects. Wrong byte order produces a different hash, causing rejection as "Difficulty too low".

## Verified Working Components

- Double SHA256 implementation matches genesis block hash
- Midstate optimization produces correct hashes
- Difficulty calculation returns correct values
- Target conversion (bits → target) works correctly
- Share difficulty check passes locally

## Working Commit Reference

Commit `5b164a2` was the last known working version. It fixed the original "Difficulty too low" by not reversing version/ntime/nbits since they're already sent as little-endian by stratum.

## Files Modified (This Session)

| File | Change |
|------|--------|
| `src/miner.js` | Use original job ntime for submission |
| `src/mining/job.js` | Store ntime in job object |
| `src/mining/worker.js` | Remove merge conflict markers |
| `src/stratum/client.js` | Cleanup |

## Debug/Test Files Created

| File | Purpose |
|------|---------|
| `test-genesis.mjs` | Genesis block hash verification |
| `test-byte-order.js` | Nonce byte order testing |
| `test-block.mjs` | Block construction testing |
| `test-merkle.mjs` | Merkle root calculation |
| `verify-current-implementation.js` | Current code verification |
| `debug-genesis-correct.js` | Correct genesis implementation |

## Next Steps

1. **Fix nonce byte order**: Change `writeUInt32LE` → `writeUInt32BE` in worker.js and block.js
2. **Verify with genesis block**: Test produces correct genesis block hash
3. **Test against pool**: Submit shares and verify acceptance
4. **DO NOT** change anything else until this is verified working
