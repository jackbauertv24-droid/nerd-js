import { doubleSHA256 } from '../crypto/sha256.js';
import { computeMidstate, doubleSHA256FromMidstate } from '../crypto/midstate.js';
import { buildCoinbase, computeMerkleRoot, buildBlockHeader, incrementExtranonce2 } from '../mining/block.js';
import { checkHashAgainstTarget, difficultyToTarget, calculateShareDifficulty } from '../crypto/utils.js';

console.log('=== Full Mining Flow Verification ===\n');

console.log('1. Genesis Block Hash Verification:');
console.log('====================================');

const genesisBlockHash = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';

const header = Buffer.from('0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c', 'hex');
const hash = doubleSHA256(header);
const hashLE = Buffer.from(hash).reverse().toString('hex');

console.log(`Header length: ${header.length} bytes`);
console.log(`Computed hash: ${hashLE}`);
console.log(`Expected:      ${genesisBlockHash}`);
console.log(`Hash matches: ${hashLE === genesisBlockHash ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('2. Midstate Optimization Verification:');
console.log('======================================');

const first64 = header.slice(0, 64);
const last16 = header.slice(64, 80);
const midstate = computeMidstate(first64);
const hashFromMidstate = doubleSHA256FromMidstate(midstate, last16);
const hashFromMidstateLE = Buffer.from(hashFromMidstate).reverse().toString('hex');

console.log(`Midstate hash: ${hashFromMidstateLE}`);
console.log(`Midstate matches: ${hashFromMidstateLE === genesisBlockHash ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('3. Block Header Construction Test:');
console.log('==================================');

// Values from stratum would come in these formats:
const version = '01000000';
const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
const merkleRootHex = '3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a';
const ntime = '29ab5f49';
const nbits = 'ffff001d';
const nonceValue = 0x7c2bac1d;

const builtHeader = buildBlockHeader(version, prevHash, Buffer.from(merkleRootHex, 'hex').reverse(), ntime, nbits, nonceValue);
const builtHash = doubleSHA256(builtHeader);
const builtHashLE = Buffer.from(builtHash).reverse().toString('hex');

console.log(`Built header: ${builtHeader.toString('hex')}`);
console.log(`Hash of built: ${builtHashLE}`);
console.log(`Matches genesis: ${builtHashLE === genesisBlockHash ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('4. Merkle Root Computation (no merkle branches):');
console.log('===============================================');

const coinbase = Buffer.from('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858eeac00000000', 'hex');
const computedMerkleRoot = computeMerkleRoot(coinbase, []);
const computedMerkleRootLE = Buffer.from(computedMerkleRoot).reverse().toString('hex');

const expectedMerkleRootLE = merkleRootHex;
console.log(`Computed merkle root (LE): ${computedMerkleRootLE}`);
console.log(`Expected merkle root (LE): ${expectedMerkleRootLE}`);
console.log(`Merkle root matches: ${computedMerkleRootLE === expectedMerkleRootLE ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('5. Extranonce2 Increment Test:');
console.log('==============================');

const en2_v1 = '00000000';
const en2_v2 = incrementExtranonce2(en2_v1);
const en2_v3 = incrementExtranonce2('ffffffff');

console.log(`Initial: ${en2_v1}`);
console.log(`After increment: ${en2_v2}`);
console.log(`Increment works: ${en2_v2 === '01000000' ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Overflow test: ${en2_v3}`);
console.log(`Overflow wraps: ${en2_v3 === '00000000' ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('6. Share Difficulty Verification:');
console.log('==================================');

const poolDifficulty = 0.0001;
const poolTarget = difficultyToTarget(poolDifficulty);
const genesisDifficulty = calculateShareDifficulty(hash);

console.log(`Pool difficulty: ${poolDifficulty}`);
console.log(`Genesis difficulty: ${genesisDifficulty.toFixed(4)}`);
console.log(`Genesis meets pool: ${checkHashAgainstTarget(hash, poolTarget) ? 'YES ✓' : 'NO ✗'}\n`);

console.log('=== Summary ===');
const allPass = hashLE === genesisBlockHash && 
                hashFromMidstateLE === genesisBlockHash && 
                builtHashLE === genesisBlockHash &&
                builtHeader.equals(header);
console.log(allPass ? 'All core tests PASS ✓' : 'Some tests FAIL ✗');
