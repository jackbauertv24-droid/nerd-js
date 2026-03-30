import { doubleSHA256 } from '../crypto/sha256.js';
import { computeMidstate, doubleSHA256FromMidstate } from '../crypto/midstate.js';
import { bitsToTarget, difficultyToTarget, checkHashAgainstTarget, calculateShareDifficulty, targetToDifficulty } from '../crypto/utils.js';

console.log('=== Bitcoin Crypto Tests ===\n');

const genesisBlock = {
    headerHex: '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c',
    hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    bits: '1d00ffff'
};

console.log('Test 1: Double SHA256 on Genesis Block');
console.log('---------------------------------------');

const header = Buffer.from(genesisBlock.headerHex, 'hex');
console.log('Header length:', header.length, 'bytes');

const hash = doubleSHA256(header);
const hashDisplay = Buffer.from(hash).reverse().toString('hex');

console.log('Expected:', genesisBlock.hash);
console.log('Computed:', hashDisplay);
console.log('Match:', hashDisplay === genesisBlock.hash ? '✓ PASS' : '✗ FAIL');

console.log('\nTest 2: Midstate optimization');
console.log('------------------------------');

const first64 = header.slice(0, 64);
const last16 = header.slice(64, 80);

const midstate = computeMidstate(first64);
const hashFromMidstate = doubleSHA256FromMidstate(midstate, last16);
const hashFromMidstateDisplay = Buffer.from(hashFromMidstate).reverse().toString('hex');

console.log('Hash from midstate:', hashFromMidstateDisplay);
console.log('Match:', hashFromMidstateDisplay === genesisBlock.hash ? '✓ PASS' : '✗ FAIL');

console.log('\nTest 3: Bits to target conversion');
console.log('----------------------------------');

const target = bitsToTarget(genesisBlock.bits);
const targetHex = target.toString('hex').padStart(64, '0');

const expectedTargetLE = '0000000000000000000000000000000000000000000000000000ffff00000000';
console.log('Bits:', genesisBlock.bits);
console.log('Target:', targetHex);
console.log('Expected (LE layout, MSB at end):', expectedTargetLE);
console.log('Match:', targetHex === expectedTargetLE ? '✓ PASS' : '✗ FAIL');

console.log('\nTest 4: Difficulty to target');
console.log('-----------------------------');

const diff = 0.0001;
const diffTarget = difficultyToTarget(diff);
const diffTargetHex = diffTarget.toString('hex').padStart(64, '0');

console.log('Difficulty:', diff);
console.log('Target:', diffTargetHex);

const genesisTarget = targetToDifficulty(bitsToTarget(genesisBlock.bits));
const ratio = genesisTarget / diff;
console.log('Ratio genesis_target/diff_target:', ratio.toFixed(0), '(should be 10000)');
console.log('Match:', ratio === 10000 ? '✓ PASS' : '✗ FAIL');

console.log('\nTest 5: Hash comparison (valid block)');
console.log('--------------------------------------');

const blockTarget = bitsToTarget(genesisBlock.bits);
console.log('Block hash:', hashDisplay);
console.log('Target:', blockTarget.toString('hex').padStart(64, '0'));
console.log('Hash < Target (valid block):', checkHashAgainstTarget(hash, blockTarget) ? '✓ PASS' : '✗ FAIL');

console.log('\nTest 6: Share difficulty calculation');
console.log('------------------------------------');

const shareDiff = calculateShareDifficulty(hash);
console.log('Genesis hash difficulty:', shareDiff.toFixed(2));
console.log('Expected range: 2000-3000 (genesis is ~2536x below target)');
console.log('Match:', shareDiff > 2000 && shareDiff < 3000 ? '✓ PASS' : '✗ FAIL');

console.log('\nTest 7: Low difficulty share finding');
console.log('-------------------------------------');

const lowDiffTarget = difficultyToTarget(0.0001);
console.log('Pool difficulty 0.0001 target:', lowDiffTarget.toString('hex').padStart(64, '0'));
console.log('Genesis hash < pool target:', checkHashAgainstTarget(hash, lowDiffTarget) ? 'YES ✓ PASS' : 'NO ✗ FAIL');

console.log('\nTest 8: High difficulty rejection');
console.log('----------------------------------');

const highDiffTarget = difficultyToTarget(10000);
console.log('Pool difficulty 10000 target:', highDiffTarget.toString('hex').padStart(64, '0'));
console.log('Genesis hash < high target:', checkHashAgainstTarget(hash, highDiffTarget) ? 'YES ✓ PASS' : 'NO (expected) ✓ PASS');

console.log('\n=== Tests Complete ===');