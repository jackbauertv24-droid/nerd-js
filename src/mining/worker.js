import { parentPort } from 'worker_threads';
import { computeMidstate, doubleSHA256FromMidstate } from '../crypto/midstate.js';
import { checkHashAgainstTarget, calculateShareDifficulty, bufferToHex } from '../crypto/utils.js';

let running = false;

parentPort.on('message', (msg) => {
    if (msg.type === 'start') {
        running = true;
        mine(msg.data);
    } else if (msg.type === 'stop') {
        running = false;
    }
});

function mine(data) {
    const { header, target, nonceStart, nonceEnd, jobId } = data;
    
    const first64 = header.slice(0, 64);
    const last16 = header.slice(64, 80);
    
    const midstate = computeMidstate(first64);
    
    const last16Buffer = Buffer.from(last16);
    const startTime = Date.now();
    
    for (let nonce = nonceStart; nonce < nonceEnd && running; nonce++) {
        last16Buffer.writeUInt32LE(nonce, 12);
        
        const hash = doubleSHA256FromMidstate(midstate, last16Buffer);
        
        if (checkHashAgainstTarget(hash, target)) {
            const diff = calculateShareDifficulty(hash);
            
            parentPort.postMessage({
                type: 'share',
                data: {
                    jobId,
                    nonce,
                    nonceHex: nonceToHex(nonce),
                    difficulty: diff,
                    hash: bufferToHex(hash)
                }
            });
        }
        
        if ((nonce - nonceStart) % 100000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = (nonce - nonceStart) / elapsed;
            
            parentPort.postMessage({
                type: 'progress',
                data: {
                    hashes: nonce - nonceStart,
                    hashRate: rate
                }
            });
        }
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    const totalHashes = nonceEnd - nonceStart;
    
    parentPort.postMessage({
        type: 'complete',
        data: {
            jobId,
            totalHashes,
            elapsed,
            avgHashRate: totalHashes / elapsed
        }
    });
}

function nonceToHex(nonce) {
    // When submitting to stratum, nonce needs to be big-endian hex (display order)
    // Even though it's stored little-endian in the block header
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(nonce, 0);
    return buf.toString('hex');
}