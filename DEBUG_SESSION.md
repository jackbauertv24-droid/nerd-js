# NerdJS Debug Session - March 25, 2026

## Problem

Shares consistently rejected with "Difficulty too low" error.

## Reference Implementations Used

### 1. Bitcoin Wiki - Block Hashing Algorithm
**URL**: en.bitcoin.it/wiki/Block_hashing_algorithm

All fields in the 80-byte Bitcoin block header are stored as **big-endian (BE)** bytes.

### 2. Working Miner Reference
**URL**: github.com/montyanderson/miner.js

A working stratum Bitcoin miner achieving ~400 KH/s on antpool.com.

## Root Cause Identified

**Nonce byte order was wrong** - The nonce was being written as little-endian (LE) but Bitcoin block headers require big-endian (BE) format for all fields.

### Evidence from Genesis Block

| Nonce in Header | Format | Produces Correct Hash? |
|-----------------|--------|----------------------|
| `7c2bac1d` | LE (wrong) | ❌ No |
| `1dac2b7c` | BE (correct) | ✅ Yes |

### Evidence from Block 125552

| Nonce in Header | Format | Produces Correct Hash? |
|-----------------|--------|----------------------|
| `9546a142` | LE (wrong) | ❌ No |
| `42a14695` | BE (correct) | ✅ Yes |

## Fixes Applied

### 1. worker.js - Nonce in Block Header
```javascript
// BEFORE (wrong)
last16Buffer.writeUInt32LE(nonce, 12);

// AFTER (correct)
last16Buffer.writeUInt32BE(nonce, 12);
```

### 2. worker.js - Nonce to Hex for Submission
```javascript
// BEFORE (wrong)
buf.writeUInt32LE(nonce, 0);

// AFTER (correct)  
buf.writeUInt32BE(nonce, 0);
```

### 3. block.js - Nonce in Header Construction
```javascript
// BEFORE (wrong)
const nonceBuf = uint32LE(nonce);

// AFTER (correct)
const nonceBuf = uint32BE(nonce);
```

### 4. miner.js - ntime for Submission
```javascript
// BEFORE (wrong)
const currentNtime = Math.floor(Date.now() / 1000);
result = await stratumClient.submit(..., currentNtime, nonceHex);

// AFTER (correct)
result = await stratumClient.submit(..., job.ntime, nonceHex);
```

## Files Modified

| File | Change |
|------|--------|
| `src/mining/worker.js` | writeUInt32LE → writeUInt32BE for nonce |
| `src/mining/block.js` | uint32LE → uint32BE for nonce |
| `src/miner.js` | Use job.ntime instead of current timestamp |

## Test Verification

Created `src/test/block-verify.test.js` with known block data:

- Genesis Block (Block 0) - verified against blockchain.info
- Block 125552 - verified against Bitcoin Wiki example
- Nonce byte order verification against specification

All tests pass:
```
✓ Test 1: Genesis block hash
✓ Test 2: Block 125552 hash  
✓ Test 3: Nonce byte order (BE is correct)
✓ Test 4: buildBlockHeader function
```

## Key Finding

All 4-byte fields in Bitcoin block header (version, ntime, nbits, nonce) must be stored as **big-endian** bytes. This was confirmed by:
1. Computing hash of genesis block with different nonce formats
2. Computing hash of block 125552 with different nonce formats
3. Verifying against Bitcoin Wiki specification
