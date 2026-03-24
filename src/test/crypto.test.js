import { doubleSHA256 } from '../crypto/sha256.js';
import { computeMidstate, doubleSHA256FromMidstate } from '../crypto/midstate.js';
import { bitsToTarget, difficultyToTarget, checkHashAgainstTarget } from '../crypto/utils.js';

console.log('=== Bitcoin Crypto Tests ===\n');

// Genesis block (block 0) - the most reliable test vector
const genesisBlock = {
    headerHex: '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c',
    hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    bits: '1d00ffff'
};

// Test 1: Double SHA256
console.log('Test 1: Double SHA256 on Genesis Block');
console.log('---------------------------------------');

const header = Buffer.from(genesisBlock.headerHex, 'hex');
console.log('Header length:', header.length, 'bytes');

const hash = doubleSHA256(header);
const hashLE = Buffer.from(hash).reverse();
const hashHex = hashLE.toString('hex');

console.log('Expected:', genesisBlock.hash);
console.log('Computed:', hashHex);
console.log('Match:', hashHex === genesisBlock.hash ? '✓ PASS' : '✗ FAIL');

// Test 2: Midstate optimization
console.log('\nTest 2: Midstate optimization');
console.log('------------------------------');

const first64 = header.slice(0, 64);
const last16 = header.slice(64, 80);

const midstate = computeMidstate(first64);
const hashFromMidstate = doubleSHA256FromMidstate(midstate, last16);
const hashFromMidstateLE = Buffer.from(hashFromMidstate).reverse();

console.log('Hash from midstate:', hashFromMidstateLE.toString('hex'));
console.log('Match:', hashFromMidstateLE.toString('hex') === hashHex ? '✓ PASS' : '✗ FAIL');

// Test 3: Bits to target conversion
console.log('\nTest 3: Bits to target conversion');
console.log('----------------------------------');

const target = bitsToTarget(genesisBlock.bits);
const targetHex = target.toString('hex').padStart(64, '0');

// For bits 0x1d00ffff:
// exponent = 0x1d = 29, coefficient = 0x00ffff
// target = 0x00ffff * 2^(8*26) = 0x00000000ffff0000000000000000000000000000000000000000000000000000
const expectedTarget = '00000000ffff0000000000000000000000000000000000000000000000000000';
console.log('Bits:', genesisBlock.bits);
console.log('Target:', targetHex);
console.log('Expected:', expectedTarget);
console.log('Match:', targetHex === expectedTarget ? '✓ PASS' : '✗ FAIL');

// Test 4: Difficulty to target
console.log('\nTest 4: Difficulty to target');
console.log('-----------------------------');

const diff = 0.0001;
const diffTarget = difficultyToTarget(diff);
console.log('Difficulty:', diff);
console.log('Target:', diffTarget.toString('hex').padStart(64, '0'));

// For difficulty 0.0001:
// max_target / difficulty = 0x00000000ffff0000... / 0.0001
// = 0x00000000ffff0000... * 10000
// = 0x000002aaa8000... (approximately)
const expectedDiffTarget = '000002aaa88000000000000000000000000000000000000000000000000000000';
console.log('Expected approx:', expectedDiffTarget);

// Test 5: Hash comparison (valid block)
console.log('\nTest 5: Hash comparison (valid block)');
console.log('--------------------------------------');

// checkHashAgainstTarget automatically reverses from SHA256 BE to Bitcoin LE
const blockTarget = bitsToTarget(genesisBlock.bits);
console.log('Block hash:', Buffer.from(hash).reverse().toString('hex'));
console.log('Target:', blockTarget.toString('hex').padStart(64, '0'));
console.log('Hash < Target (valid block):', checkHashAgainstTarget(hash, blockTarget) ? '✓ PASS' : '✗ FAIL');

// Test 6: Share difficulty calculation
console.log('\nTest 6: Low difficulty share finding');
console.log('-------------------------------------');

// Create a test case with very low target (high difficulty threshold)
const lowDiffTarget = difficultyToTarget(0.0001);
console.log('Pool difficulty 0.0001 target:', lowDiffTarget.toString('hex').padStart(64, '0'));

// Check if genesis block hash would be a valid share at this difficulty
console.log('Genesis hash < pool target:', checkHashAgainstTarget(hash, lowDiffTarget) ? 'YES (valid share)' : 'NO');

console.log('\n=== Tests Complete ===');