import { network } from "hardhat";

async function main() {
  const connection = await network.connect();
  const { ethers, networkName } = connection;
  const factory = await ethers.deployContract("TicketShopFactory");
  await factory.waitForDeployment();

  console.log(`network=${networkName}`);
  console.log(`factory=${await factory.getAddress()}`);
  console.log("Set VITE_FACTORY_ADDRESS to this value in your frontend .env file.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
