import { doubleSHA256 } from '../crypto/sha256.js';
import { buildBlockHeader } from '../mining/block.js';

console.log('=== Block Construction Verification Tests ===\n');
console.log('References:');
console.log('  - Bitcoin Wiki: en.bitcoin.it/wiki/Block_hashing_algorithm');
console.log('  - Working Miner: github.com/montyanderson/miner.js\n');
console.log('NOTE: All fields in Bitcoin block header are stored as big-endian (BE) bytes.\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, actual, expected) {
    const pass = actual === expected;
    tests.push({ name, pass, actual, expected });
    if (pass) {
        passed++;
        console.log(`✓ PASS: ${name}`);
    } else {
        failed++;
        console.log(`✗ FAIL: ${name}`);
        console.log(`  Expected: ${expected}`);
        console.log(`  Actual:   ${actual}`);
    }
}

console.log('=== Test 1: Raw Genesis Block Hash ===');
console.log('Reference: blockchain.info rawblock/0\n');

const genesisHeaderHex = '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c';
const expectedGenesisHashLE = '6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000';

const genesisHeader = Buffer.from(genesisHeaderHex, 'hex');
const genesisHash = doubleSHA256(genesisHeader);
const genesisHashLE = genesisHash.toString('hex');

test('Genesis block hash (LE format)', genesisHashLE, expectedGenesisHashLE);

console.log('\n=== Test 2: Raw Block 125552 Hash ===');
console.log('Reference: en.bitcoin.it/wiki/Block_hashing_algorithm\n');

const block125552HeaderHex = '01000000' +
    '81cd02ab7e569e8bcd9317e2fe99f2de44d49ab2b8851ba4a308000000000000' +
    'e320b6c2fffc8d750423db8b1eb942ae710e951ed797f7affc8892b0f1fc122b' +
    'c7f5d74d' +
    'f2b9441a' +
    '42a14695';
const expectedBlock125552HashLE = '1dbd981fe6985776b644b173a4d0385ddc1aa2a829688d1e0000000000000000';

const block125552Header = Buffer.from(block125552HeaderHex, 'hex');
const block125552Hash = doubleSHA256(block125552Header);
const block125552HashLE = block125552Hash.toString('hex');

test('Block 125552 hash (LE format)', block125552HashLE, expectedBlock125552HashLE);

console.log('\n=== Test 3: Nonce Byte Order in Header ===');
console.log('Bitcoin block header stores nonce as big-endian (BE) bytes.\n');

const testNonce = 0x42a14695;
const header = Buffer.alloc(80);

header.writeUInt32BE(testNonce, 76);
const nonceInHeader = header.slice(76, 80).toString('hex');
test('Nonce written as BE at offset 76', nonceInHeader, '42a14695');

header.writeUInt32LE(testNonce, 76);
const nonceInHeaderLE = header.slice(76, 80).toString('hex');
test('Nonce written as LE at offset 76 (wrong)', nonceInHeaderLE, '9546a142');

console.log('\n=== Test 4: buildBlockHeader Function ===');
console.log('Testing buildBlockHeader with BE nonce\n');

const knownJob = {
    version: '01000000',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    ntime: '29ab5f49',
    nbits: 'ffff001d'
};
const knownMerkleRoot = Buffer.from('3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a', 'hex');
const knownNonce = 0x1dac2b7c;

const builtHeader = buildBlockHeader(
    knownJob.version,
    knownJob.prevHash,
    knownMerkleRoot,
    knownJob.ntime,
    knownJob.nbits,
    knownNonce
);

test('Header length is 80 bytes', builtHeader.length, 80);

const nonceAt76 = builtHeader.slice(76, 80).toString('hex');
test('Nonce at offset 76 is BE (1dac2b7c)', nonceAt76, '1dac2b7c');

const builtHash = doubleSHA256(builtHeader);
const builtHashLE = builtHash.toString('hex');
test('Produces correct genesis hash', builtHashLE, expectedGenesisHashLE);

console.log('\n=== Test Summary ===');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    console.log('\nFailed tests:');
    tests.filter(t => !t.pass).forEach(t => {
        console.log(`  - ${t.name}`);
    });
    process.exit(1);
} else {
    console.log('\n✓ All tests passed!');
    console.log('\n=== Verification Complete ===');
    process.exit(0);
}
