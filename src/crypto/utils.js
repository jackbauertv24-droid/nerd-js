export function hexToBuffer(hex) {
    return Buffer.from(hex, 'hex');
}

export function bufferToHex(buf) {
    return buf.toString('hex');
}

export function hexToLE(hex) {
    return Buffer.from(hex, 'hex').reverse();
}

export function leToHex(buf) {
    return Buffer.from(buf).reverse().toString('hex');
}

export function uint32LE(nonce) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(nonce, 0);
    return buf;
}

export function uint32BE(n) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(n, 0);
    return buf;
}

export function bitsToTarget(nbitsHex) {
    const nbits = Buffer.from(nbitsHex, 'hex');
    const exponent = nbits[0];
    const mantissa = (nbits[1] << 16) | (nbits[2] << 8) | nbits[3];
    
    const target = Buffer.alloc(32, 0);
    
    if (exponent <= 3) {
        let val = mantissa >> (8 * (3 - exponent));
        for (let i = 31; i >= 0 && val > 0; i--) {
            target[i] = val & 0xff;
            val >>= 8;
        }
    } else {
        const shift = exponent - 3;
        const mantissaBytes = [
            (mantissa >> 16) & 0xff,
            (mantissa >> 8) & 0xff,
            mantissa & 0xff
        ];
        
        const startPos = 32 - shift - 3;
        if (startPos >= 0 && startPos < 29) {
            target[startPos] = mantissaBytes[0];
            target[startPos + 1] = mantissaBytes[1];
            target[startPos + 2] = mantissaBytes[2];
        }
    }
    
    return target;
}

export function targetToDifficulty(target) {
    const TRUE_DIFF_ONE = BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000');
    
    // Target is stored as little-endian in buffer, reverse to big-endian for correct BigInt conversion
    const targetHexBE = Buffer.from(target).reverse().toString('hex');
    let targetBig = BigInt('0x' + targetHexBE || '0');
    
    if (targetBig === 0n) {
        targetBig = 1n;
    }
    
    const difficulty = Number(TRUE_DIFF_ONE) / Number(targetBig);
    return difficulty;
}

export function difficultyToTarget(difficulty) {
    const TRUE_DIFF_ONE = BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000');
    
    // target = max_target / difficulty
    // Use scaled arithmetic to handle floating point
    const scaledDiff = Math.round(difficulty * 1e15);
    const targetBig = TRUE_DIFF_ONE * BigInt(1e15) / BigInt(scaledDiff);
    const targetHex = targetBig.toString(16).padStart(64, '0');
    
    // Convert to buffer as little-endian (reverse byte order) to match how bitsToTarget works
    return Buffer.from(targetHex, 'hex').reverse();
}

export function checkHashAgainstTarget(hash, target) {
    // Hash comes from SHA-256 output as big-endian, reverse to get Bitcoin little-endian
    const hashLE = Buffer.from(hash).reverse();
    
    for (let i = 0; i < 32; i++) {
        if (hashLE[i] < target[i]) return true;
        if (hashLE[i] > target[i]) return false;
    }
    return true;
}

export function hashToBigEndian(hash) {
    return Buffer.from(hash).reverse();
}

export function calculateShareDifficulty(hash) {
    const TRUE_DIFF_ONE = BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000');
    
    const hashLE = Buffer.from(hash).reverse();
    const hashBig = BigInt('0x' + hashLE.toString('hex') || '0');
    
    if (hashBig === 0n) {
        return 0;
    }
    
    return Number(TRUE_DIFF_ONE) / Number(hashBig);
}
