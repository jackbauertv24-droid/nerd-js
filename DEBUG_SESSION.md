# NerdJS Debug Session - Share Rejection Issue

## Problem
Shares are being rejected by public-pool.io with "Difficulty too low" error, despite local difficulty calculation showing shares meet/exceed pool minimum (e.g., 0.0014 > 0.0001).

## Summary
After extensive debugging, the root cause is still unknown. The pool computes a different hash than our local computation when verifying submissions.

---

## Verified Working Components

### Crypto Implementation ✓
- Genesis block hash verification passes
- Block 125552 hash verification passes
- Midstate optimization produces correct hashes
- All crypto tests pass

### Worker Mining ✓
- Finds shares with difficulty > pool minimum
- Correctly computes hash locally
- Submits with correct jobId

---

## Code Changes Made

### 1. Merkle Branch Handling
**File**: `src/mining/block.js`

Changed to NOT reverse merkle branch hashes (matching montyanderson/miner.js):
```javascript
// Before (wrong):
const branchBuf = Buffer.from(branch, 'hex').reverse();

// After (correct):
const branchBuf = Buffer.from(branch, 'hex');
```

### 2. Worker Nonce Submission
**File**: `src/mining/worker.js`

Nonce hex conversion uses LE format (matching NerdMiner_v2):
```javascript
function nonceToHex(nonce) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(nonce, 0);  // LE format
    return buf.toString('hex');
}
```

### 3. Job ID Handling
**File**: `src/miner.js`

Fixed to use the worker's jobId for submission:
```javascript
const { jobId: workerJobId } = msg.data;
// ...
const submitJobId = job.jobId === workerJobId ? job.jobId : workerJobId;
```

---

## What Was Tested

### Byte Order (BE vs LE)
- **BE**: Nonce written as BE in header, genesis block hash passes
- **LE**: Used in NerdMiner_v2 submission format
- Both approaches produce "Difficulty too low" error

### Pool Tests
- **public-pool.io:21496**: Fails with "Difficulty too low"
- **solo.ckpool.org:3333**: Connects but requires very high difficulty (10000)

### Reference Implementations
1. **NerdMiner_v2** (BitMaker-hub/NerdMiner_v2)
   - Works with public-pool.io
   - Uses `__builtin_bswap32(nonce)` for header
   - Submits `String(nonce, HEX)` (LE on ESP32)

2. **montyanderson/miner.js**
   - Works on antpool.com
   - Reverses ALL header fields (version, prevhash, merkle, ntime, nbits)
   - Uses LE for nonce
   - Does NOT reverse merkle branch hashes

---

## Debug Output Examples

### Submission Data
```
[SUBMIT] Submitting:
  workerJobId: 48d11d5
  currentJobId: 48d11d5
  using jobId: 48d11d5
  extranonce2: 00000000
  ntime: 69c3acab
  nonce: 4efd0000

✗ Share rejected: [23,"Difficulty too low",""]
```

### Hash Verification
```
Expected diff: 0.00025767
Pool Difficulty: 0.0001
Pool still rejects with "Difficulty too low"
```

---

## Current Implementation State

### Block Header Construction
- Version: Direct from stratum (no reversal)
- PrevHash: Word-swap 4-byte groups
- MerkleRoot: Direct from computeMerkleRoot
- Ntime: Direct from stratum
- Nbits: Direct from stratum
- Nonce: BE in header

### Submission Format
- jobId: Matched to worker
- extranonce2: Incremented per share
- ntime: From job
- nonce: LE hex string

---

## Open Questions

1. **Why does the pool compute a different hash?**
   - Our hash computation is verified correct against known blocks
   - The pool must be reconstructing the block differently

2. **Is there a subtle byte order issue?**
   - We've tested BE and LE extensively
   - NerdMiner_v2 works with public-pool.io

3. **Is public-pool.io using a non-standard protocol?**
   - Could have specific requirements not in Stratum V1 spec

---

## Test Commands

```bash
# Run miner
node src/index.js -w bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu

# Run tests
npm test
```

---

## Next Steps Suggestions

1. Try a different mining pool (btc.com, antpool) to isolate if issue is pool-specific
2. Compare exact submission with NerdMiner_v2 (add debug logging to both)
3. Check public-pool.io documentation for any specific requirements
4. Consider implementing full LE approach like montyanderson/miner.js

---

## Files Modified

- `src/mining/block.js` - Merkle branch handling
- `src/mining/worker.js` - Nonce to hex conversion
- `src/miner.js` - Job ID handling

---

*Last updated: 2026-03-25*
