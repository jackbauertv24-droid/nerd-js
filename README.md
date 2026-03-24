# nerd-js

A Node.js Bitcoin solo miner implementing the Stratum V1 protocol. This is a console-only port of the [NerdMiner_v2](https://github.com/BitMaker-hub/NerdMiner_v2) project, focused on the core mining functionality.

## Features

- Stratum V1 protocol implementation
- Multi-core mining with worker threads
- SHA256d with midstate optimization
- Automatic reconnect on disconnect
- Real-time hashrate and stats display

## Installation

```bash
npm install
```

## Usage

```bash
# Basic usage
node src/index.js --wallet <your_bitcoin_address>

# With options
node src/index.js \
  --wallet bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh \
  --pool public-pool.io \
  --port 21496 \
  --threads 4
```

### CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--wallet` | `-w` | Bitcoin wallet address (required) | - |
| `--pool` | `-p` | Pool host | `public-pool.io` |
| `--port` | | Pool port | `21496` |
| `--threads` | `-t` | Number of mining threads | CPU cores |
| `--password` | | Pool password | `x` |
| `--help` | `-h` | Show help | - |
| `--version` | `-v` | Show version | - |

## Compatible Pools

Pools that support low-difficulty solo mining:

| Pool | Port | Notes |
|------|------|-------|
| public-pool.io | 21496 | Open source, recommended |
| pool.nerdminers.org | 3333 | Official NerdMiner pool |

## Performance

Single-threaded performance: ~150-200 kH/s (varies by CPU)

## Architecture

```
src/
├── index.js          # CLI entry point
├── miner.js          # Main orchestrator, worker pool
├── stratum/
│   ├── client.js     # TCP connection, JSON-RPC
│   └── protocol.js   # Message builders/parsers
├── crypto/
│   ├── sha256.js     # Double SHA256
│   ├── midstate.js   # Midstate optimization
│   └── utils.js      # Hex conversion, diff calc
├── mining/
│   ├── block.js      # Coinbase, merkle, header
│   ├── job.js        # Job management
│   └── worker.js     # Worker thread (nonce search)
└── utils/
    ├── logger.js     # Colored console output
    └── display.js    # Stats table rendering
```

## Disclaimer

This is an educational project. Solo mining has an extremely low probability of finding a block. Do not expect to earn any Bitcoin from this miner. It is intended for learning about Bitcoin mining and the Stratum protocol.

## License

MIT