# NerdJS Debug Session - March 25, 2026

## Problem

Shares consistently rejected with "Difficulty too low" error despite local difficulty calculation showing shares exceed pool minimum.

## Reference Implementation

**Working Miner**: [montyanderson/miner.js](https://github.com/montyanderson/miner.js)

A simple, working stratum Bitcoin miner in JavaScript that achieves ~400 KH/s on antpool.com.

### Key Findings from Reference

| Operation | Code | Format |
|-----------|------|--------|
| Write nonce to block header | `block_header.writeUInt32LE(nonce, block_header.length - 4)` | **Little-endian** |
| Extract nonce for submission | `block_header.slice(block_header.length - 4).toString("hex")` | Direct LE bytes → hex |

**Critical**: The reference uses **little-endian** for everything. The nonce is written as LE in the block header, and extracted directly as LE bytes for submission - no byte swapping needed.

## Root Causes Identified

### Issue 1: Nonce Hex Conversion (WRONG)

**Location**: `src/mining/worker.js` line 76-79

**Problem**: nonceToHex was using `writeUInt32BE` which produces big-endian hex, but the pool expects little-endian.

```javascript
// BEFORE (wrong) - produced BE hex
function nonceToHex(nonce) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(nonce, 0);  // WRONG
    return buf.toString('hex');
}

// AFTER (correct) - produces LE hex matching the header
function nonceToHex(nonce) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(nonce, 0);  // CORRECT
    return buf.toString('hex');
}
```

### Issue 2: ntime Submission (WRONG)

**Location**: `src/miner.js` line 222-228

**Problem**: Using current timestamp instead of original job ntime. When pool reconstructs the block, it uses the original ntime from the job.

```javascript
// BEFORE (wrong)
const currentNtime = Math.floor(Date.now() / 1000);
const result = await this.stratumClient.submit(job.jobId, job.extranonce2, currentNtime, nonceHex);

// AFTER (correct)
const result = await this.stratumClient.submit(job.jobId, job.extranonce2, job.ntime, nonceHex);
```

## Bitcoin Block Header Specification (from en.bitcoin.it/wiki/Block_hashing_algorithm)

All 80-byte block header fields are stored as **little-endian**:
- Version: 4 bytes LE
- PrevHash: 32 bytes LE
- MerkleRoot: 32 bytes LE
- Time (ntime): 4 bytes LE
- Bits (nbits): 4 bytes LE
- Nonce: 4 bytes LE

## Files Modified

| File | Change |
|------|--------|
| `src/mining/worker.js` | Fixed nonceToHex: writeUInt32BE → writeUInt32LE |
| `src/miner.js` | Fixed ntime: current timestamp → job.ntime |

## Previous Wrong Assumption

The earlier debug session incorrectly concluded nonce should be big-endian based on genesis block analysis. This was WRONG because:

1. Genesis block displays nonce as `1dac2b7c` in big-endian display format
2. But in the actual 80-byte header stored in memory, it's stored as little-endian bytes `7c,2b,ac,1d`
3. The working reference implementation confirms this - it uses LE throughout

## Verified Working Components

- Double SHA256 implementation matches genesis block hash
- Midstate optimization produces correct hashes
- Difficulty calculation returns correct values
- Target conversion (bits → target) works correctly

## Next Steps

1. Test against pool with these fixes
2. Verify shares are accepted
3. DO NOT change byte order further without reference implementation confirmation
