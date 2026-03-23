import "dotenv/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import networkHelpers from '@nomicfoundation/hardhat-network-helpers'
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: "0.8.28",
  plugins: [hardhatEthers, networkHelpers],
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    testnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("VITE_TESTNET_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
