let messageId = 1;

export function resetMessageId() {
    messageId = 1;
}

export function buildSubscribe(userAgent = 'nerd-js/1.0.0') {
    return {
        id: messageId++,
        method: 'mining.subscribe',
        params: [userAgent]
    };
}

export function buildAuthorize(wallet, password = 'x') {
    return {
        id: messageId++,
        method: 'mining.authorize',
        params: [wallet, password]
    };
}

export function buildSuggestDifficulty(difficulty = 0.0001) {
    return {
        id: messageId++,
        method: 'mining.suggest_difficulty',
        params: [difficulty]
    };
}

export function buildSubmit(workerName, jobId, extranonce2, ntime, nonce) {
    return {
        id: messageId++,
        method: 'mining.submit',
        params: [workerName, jobId, extranonce2, ntime, nonce]
    };
}

export function parseMessage(line) {
    try {
        const msg = JSON.parse(line);
        return msg;
    } catch {
        return null;
    }
}

export function parseSubscribeResponse(msg) {
    if (!msg.result || !Array.isArray(msg.result)) {
        return null;
    }
    
    const [notifications, extranonce1, extranonce2Size] = msg.result;
    
    return {
        notifications,
        extranonce1,
        extranonce2Size: parseInt(extranonce2Size, 10)
    };
}

export function parseNotify(msg) {
    if (msg.method !== 'mining.notify') {
        return null;
    }
    
    const params = msg.params;
    if (!params || params.length < 9) {
        return null;
    }
    
    return {
        jobId: params[0],
        prevHash: params[1],
        coinb1: params[2],
        coinb2: params[3],
        merkleBranch: params[4] || [],
        version: params[5],
        nbits: params[6],
        ntime: params[7],
        cleanJobs: params[8]
    };
}

export function parseSetDifficulty(msg) {
    if (msg.method !== 'mining.set_difficulty') {
        return null;
    }
    
    return {
        difficulty: msg.params[0]
    };
}

export function serializeMessage(msg) {
    return JSON.stringify(msg) + '\n';
}