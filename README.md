## Time-based ticket release dApp

## Use the app
- deploy `TicketShopFactory` contract 
- deploy a new `TicketShop` through the `TicketShopFactory`
- buy a ticket with `queue()` before event starts
- refund a queued purchase with `cancel(purchaseId)` before event starts
- finalize a purchase with `execute(purchaseId)` after the event has started


## Set up environment variables

Create `.env` following `.env.example`.

```bash
VITE_FACTORY_ADDRESS=0x...
VITE_TESTNET_RPC_URL=
VITE_SUBGRAPH_URL=
VITE_DEPLOYER_PRIVATE_KEY=<use with hardhat deploy script in `scripts/deploy.ts`>
```

## Install

```bash
pnpm install
```

## Run frontend

```bash
pnpm dev
```

If `VITE_TESTNET_RPC_URL` is empty, the frontend automatically uses the local Hardhat RPC and a default wallet.

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

### Example ontract operations (hardhat console)
```bash
pnpm hardhat console --network testnet

> const { ethers } = await hre.network.connect();
undefined
> ethers.provider
HardhatEthersProvider {}
> await ethers.provider.getBlockNumber()
7485089

const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, signer);
const tx = await factoryContract.deployTicketShop("randomshop", 1774429935, 10000);

```


#### Addresses
Deployer proxy - [0x730CF5DDf1799754Ac0B54c308AA52bA2B706cAb](https://explorer.testnet.rootstock.io/address/0x730CF5DDf1799754Ac0B54c308AA52bA2B706cAb)
