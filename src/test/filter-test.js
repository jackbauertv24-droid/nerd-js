import { difficultyToTarget, checkHashAgainstTarget, calculateShareDifficulty } from '../crypto/utils.js';

console.log('=== Share Filtering Test ===\n');

// Test with pool difficulty 0.0001 - what the miner usually uses
const POOL_DIFF = 0.0001;
const target = difficultyToTarget(POOL_DIFF);
console.log(`Pool difficulty: ${POOL_DIFF}`);
console.log(`Target (little-endian): ${target.toString('hex').padStart(64, '0')}\n`);

// We know that the genesis block hash is 000000000019d6... which is much smaller than 0.0001 target
// So it should be accepted
import { hexToBuffer } from '../crypto/utils.js';
import { doubleSHA256 } from '../crypto/sha256.js';

// Genesis block header hash output is already little-endian from doubleSHA256
const genesisHashHexBE = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const genesisHashLE = Buffer.from(hexToBuffer(genesisHashHexBE).reverse());
console.log(`Genesis block hash (little-endian): ${genesisHashLE.toString('hex')}`);

const isValid = checkHashAgainstTarget(genesisHashLE, target);
const actualDiff = calculateShareDifficulty(genesisHashLE);
console.log(`Should be valid for ${POOL_DIFF}: genesis difficulty = ${actualDiff.toFixed(6)} > ${POOL_DIFF} = ${actualDiff > POOL_DIFF}`);
console.log(`checkHashAgainstTarget result: ${isValid ? 'VALID ✓' : 'INVALID ✗'}\n`);

// Test an "easy" hash (larger than target, should be rejected)
// Create a hash that's higher than the target
const easyHashBuf = Buffer.alloc(32, 0xff);
easyHashBuf[31] = 0x00; // Make MSB 0 to see if comparison works
const isEasyValid = checkHashAgainstTarget(easyHashBuf, target);
console.log(`Large hash test:`);
console.log(`checkHashAgainstTarget result: ${isEasyValid ? 'VALID ✗' : 'INVALID ✓'}`);
console.log(`Expected: INVALID (hash is too large)`);
