
## env

Create `.env` following `.env.example`.

```bash
VITE_FACTORY_ADDRESS=0x...
VITE_TESTNET_RPC_URL=
VITE_LOCAL_RPC_URL=http://127.0.0.1:8545
VITE_LOCAL_PRIVATE_KEY=0xac0974...
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

If `VITE_TESTNET_RPC_URL` is empty, the frontend automatically uses the local Hardhat RPC and default funded Hardhat account instead of prompting for a browser wallet connection.

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
OR
```bash
yarn hardhat deploy
```


#### Addresses
Deployer proxy - [0x7d08812cba7840e67a45246bf6e5e3507e303bb1](https://explorer.testnet.rootstock.io/address/0x7d08812cba7840e67a45246bf6e5e3507e303bb1)

`TODO:`
redeploy factory with ticketshop records
frontend works with hardhat, mmoving to testnet
