import net from 'net';
import EventEmitter from 'events';
import {
    buildSubscribe,
    buildAuthorize,
    buildSuggestDifficulty,
    buildSubmit,
    parseMessage,
    parseSubscribeResponse,
    parseNotify,
    parseSetDifficulty,
    serializeMessage
} from './protocol.js';

export class StratumClient extends EventEmitter {
    constructor(options) {
        super();
        this.host = options.host || 'public-pool.io';
        this.port = options.port || 21496;
        this.wallet = options.wallet;
        this.password = options.password || 'x';
        this.userAgent = options.userAgent || 'nerd-js/1.0.0';
        
        this.socket = null;
        this.buffer = '';
        this.connected = false;
        this.authorized = false;
        
        this.extranonce1 = '';
        this.extranonce2Size = 4;
        this.difficulty = 0.0001;
        
        this.pendingRequests = new Map();
        this.requestTimeout = 30000;
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection({
                host: this.host,
                port: this.port
            });
            
            this.socket.setEncoding('utf8');
            this.socket.setKeepAlive(true, 30000);
            this.socket.setNoDelay(true);
            
            this.socket.on('connect', () => {
                this.connected = true;
                this.emit('connected');
                resolve();
            });
            
            this.socket.on('data', (data) => {
                this.handleData(data);
            });
            
            this.socket.on('error', (err) => {
                this.emit('error', err);
                reject(err);
            });
            
            this.socket.on('close', () => {
                this.connected = false;
                this.authorized = false;
                this.clearPendingRequests(new Error('Connection closed'));
                this.emit('disconnected');
            });
        });
    }
    
    handleData(data) {
        this.buffer += data;
        
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        
        for (const line of lines) {
            if (line.trim()) {
                this.handleMessage(line);
            }
        }
    }
    
    handleMessage(line) {
        const msg = parseMessage(line);
        if (!msg) return;
        
        if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
            const { resolve, timeout } = this.pendingRequests.get(msg.id);
            clearTimeout(timeout);
            this.pendingRequests.delete(msg.id);
            resolve(msg);
            return;
        }
        
        const notify = parseNotify(msg);
        if (notify) {
            this.emit('job', notify);
            return;
        }
        
        const setDiff = parseSetDifficulty(msg);
        if (setDiff) {
            this.difficulty = setDiff.difficulty;
            this.emit('difficulty', setDiff.difficulty);
            return;
        }
    }
    
    send(msg) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(msg.id);
                reject(new Error(`Request ${msg.id} timed out`));
            }, this.requestTimeout);

            this.pendingRequests.set(msg.id, { resolve, reject, timeout });
            this.socket.write(serializeMessage(msg));
        });
    }
    
    async subscribe() {
        const msg = buildSubscribe(this.userAgent);
        const response = await this.send(msg);
        
        const sub = parseSubscribeResponse(response);
        if (sub) {
            this.extranonce1 = sub.extranonce1;
            this.extranonce2Size = sub.extranonce2Size;
        }
        
        return sub;
    }
    
    async authorize() {
        const msg = buildAuthorize(this.wallet, this.password);
        const response = await this.send(msg);
        
        if (response.result === true) {
            this.authorized = true;
            this.emit('authorized');
        }
        
        return response.result === true;
    }
    
    async suggestDifficulty(difficulty) {
        const msg = buildSuggestDifficulty(difficulty);
        await this.send(msg);
    }
    
    async submit(jobId, extranonce2, ntime, nonce) {
        const workerName = this.wallet;
        const msg = buildSubmit(workerName, jobId, extranonce2, ntime, nonce);
        const response = await this.send(msg);

        if (!response) {
            return { accepted: false, error: 'No response from pool' };
        }

        if (response.result === true) {
            return { accepted: true };
        } else {
            return {
                accepted: false,
                error: response.error || 'Unknown error'
            };
        }
    }
    
    clearPendingRequests(error) {
        for (const [id, request] of this.pendingRequests) {
            clearTimeout(request.timeout);
            request.reject(error);
        }
        this.pendingRequests.clear();
    }

    disconnect() {
        this.clearPendingRequests(new Error('Disconnecting'));
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.connected = false;
        this.authorized = false;
    }
}