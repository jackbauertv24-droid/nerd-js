import crypto from 'crypto';

export function sha256(data) {
    return crypto.createHash('sha256').update(data).digest();
}

export function doubleSHA256(data) {
    const hash1 = crypto.createHash('sha256').update(data).digest();
    return crypto.createHash('sha256').update(hash1).digest();
}

export function hash256LE(data) {
    return doubleSHA256(data).reverse();
}