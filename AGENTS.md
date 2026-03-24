# AGENTS.md

## Project Overview

NerdJS - A Node.js console-only Bitcoin solo miner ported from ESP32-based NerdMiner_v2.

## Current Status

**Working:**
- Stratum V1 protocol (subscribe, authorize, job handling, share submission)
- SHA256d with midstate optimization for efficient mining
- Block header construction (coinbase, merkle root, header assembly)
- Multi-core mining using worker_threads
- Difficulty/target conversion
- All crypto tests pass (genesis block hash verified)
- Hash computation verified correct against native Node.js crypto

**Issue:**
- Shares are being rejected by public-pool.io with "Difficulty too low" error
- Local difficulty calculation shows shares meet/exceed pool minimum (e.g., 0.00110241 > 0.0001)
- Hash computation verified correct independently
- Issue may be pool-specific or a subtle protocol mismatch

## Commands

```bash
# Run the miner
node src/index.js -w <wallet_address>

# Run tests
node src/test/crypto.test.js

# Install dependencies (none required - uses native Node.js crypto)
npm install
```

## Key Files

- `src/index.js` - CLI entry point
- `src/miner.js` - Main orchestrator, manages workers and stratum client
- `src/stratum/client.js` - TCP connection and JSON-RPC handling
- `src/stratum/protocol.js` - Stratum message builders/parsers
- `src/crypto/sha256.js` - Double SHA256 implementation
- `src/crypto/midstate.js` - SHA256 midstate optimization
- `src/crypto/utils.js` - Hex conversion, difficulty/target calculations
- `src/mining/block.js` - Coinbase, merkle root, header construction
- `src/mining/job.js` - Job management
- `src/mining/worker.js` - Worker thread for nonce searching
- `src/test/crypto.test.js` - Crypto verification tests

## Pool Configuration

Default: public-pool.io:21496 (Bitcoin solo mining pool)

## Next Steps

1. Test with a different mining pool to isolate if issue is pool-specific
2. Compare share submission format with other working miners
3. Review public-pool.io documentation for any specific requirements
4. Consider adding support for other Stratum pools

## Notes

- Uses ES modules (type: "module" in package.json)
- No external dependencies - uses native Node.js crypto module
- Midstate optimization precomputes SHA256 state from first 64 bytes of header
- Worker threads search nonces in parallel, each handling a portion of the nonce range