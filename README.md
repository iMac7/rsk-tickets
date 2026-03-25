
- deploy `TicketShopFactory` contract 
- deploy a new `TicketShop` through the `TicketShopFactory`
- buy a ticket with `queue()` before event starts
- refund a queued purchase with `cancel(purchaseId)` before event starts
- finalize a purchase with `execute(purchaseId)` after the event has started


## env

Create `.env` following `.env.example`.

```bash
VITE_FACTORY_ADDRESS=0x...
VITE_TESTNET_RPC_URL=
```

## Install

```bash
pnpm install
```

## Run frontend

```bash
pnpm dev
```

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

### Interact with contract (hardhat)
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

`TODO:`
redeploy factory with ticketshop records
frontend works with hardhat, mmoving to testnet
