
## env

Create `.env` following `.env.example`.

```bash
VITE_FACTORY_ADDRESS=0x...
TESTNET_RPC_URL=https://...
DEPLOYER_PRIVATE_KEY=0x...
```

## Install

```bash
pnpm install
```

## Run frontend

```bash
pnpm dev
```

Functionality:
- deploy a new `TicketShop` through the factory
- buy a ticket with `queue()`
- finalize a purchase with `execute(purchaseId)`
- cancel a purchase with `cancel(purchaseId)`

## Hardhat 3

Compile:

```bash
pnpm compile
```

Run a local hardhat node:

```bash
pnpm node
```

Deploy locally:

```bash
pnpm deploy --network localhost
```
