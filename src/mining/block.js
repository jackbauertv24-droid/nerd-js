import { doubleSHA256 } from '../crypto/sha256.js';
import { uint32LE } from '../crypto/utils.js';

function wordSwap4(buf) {
    const result = Buffer.from(buf);
    for (let i = 0; i < result.length; i += 4) {
        const temp0 = result[i];
        const temp1 = result[i + 1];
        result[i] = result[i + 3];
        result[i + 1] = result[i + 2];
        result[i + 2] = temp1;
        result[i + 3] = temp0;
    }
    return result;
}

export function buildCoinbase(coinb1, extranonce1, extranonce2, coinb2) {
    const coinb1Buf = Buffer.from(coinb1, 'hex');
    const extranonce1Buf = Buffer.from(extranonce1, 'hex');
    const extranonce2Buf = extranonce2.length > 0 ? Buffer.from(extranonce2, 'hex') : Buffer.alloc(0);
    const coinb2Buf = Buffer.from(coinb2, 'hex');
    
    return Buffer.concat([coinb1Buf, extranonce1Buf, extranonce2Buf, coinb2Buf]);
}

export function computeMerkleRoot(coinbaseTx, merkleBranch) {
    let hash = doubleSHA256(coinbaseTx);
    
    for (const branch of merkleBranch) {
        const branchBuf = Buffer.from(branch, 'hex');
        const combined = Buffer.concat([hash, branchBuf]);
        hash = doubleSHA256(combined);
    }
    
    return hash;
}

export function buildBlockHeader(version, prevHash, merkleRoot, ntime, nbits, nonce) {
    // Version: 4 bytes, convert from hex and reverse (LE)
    const versionBuf = Buffer.from(version, 'hex').reverse();
    
    // PrevHash: 32 bytes, convert from hex and 4-byte word swap
    const prevHashBuf = wordSwap4(Buffer.from(prevHash, 'hex'));
    
    // MerkleRoot: 32 bytes, use directly (from SHA256, already in correct format)
    const merkleRootBuf = merkleRoot;
    
    // Ntime: 4 bytes, convert from hex and reverse (LE)
    const ntimeBuf = Buffer.from(ntime, 'hex').reverse();
    
    // Nbits: 4 bytes, convert from hex and reverse (LE)
    const nbitsBuf = Buffer.from(nbits, 'hex').reverse();
    
    // Nonce: 4 bytes, write as LE
    const nonceBuf = uint32LE(nonce);
    
    return Buffer.concat([
        versionBuf,
        prevHashBuf,
        merkleRootBuf,
        ntimeBuf,
        nbitsBuf,
        nonceBuf
    ]);
}

export function generateExtranonce2(size) {
    const buf = Buffer.alloc(size, 0);
    return buf.toString('hex');
}

export function incrementExtranonce2(extranonce2Hex) {
    const buf = Buffer.from(extranonce2Hex, 'hex');
    
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] < 255) {
            buf[i]++;
            break;
        }
        buf[i] = 0;
    }
    
    return buf.toString('hex');
}

export function prepareMiningJob(job, extranonce1, extranonce2Size) {
    const extranonce2 = generateExtranonce2(extranonce2Size);
    
    const coinbase = buildCoinbase(job.coinb1, extranonce1, extranonce2, job.coinb2);
    const merkleRoot = computeMerkleRoot(coinbase, job.merkleBranch);
    
    const headerTemplate = buildBlockHeader(
        job.version,
        job.prevHash,
        merkleRoot,
        job.ntime,
        job.nbits,
        0
    );
    
    return {
        jobId: job.jobId,
        extranonce2,
        ntime: job.ntime,
        header: headerTemplate,
        merkleRoot,
        coinbase
    };
}