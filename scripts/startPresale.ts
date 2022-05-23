import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import {
  DAI__factory,
  EncountrPresale__factory,
} from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const salesDeployment = await deployments.get(CONTRACTS.sales);
  const sales = await EncountrPresale__factory.connect(
    salesDeployment.address,
    signer
  );

  const addresses = [
    "0x309BE61D5d4Bcc3d22EE99a04019616a835aA918", // Aaron
    // "0x744f7B6c2f65385e5D5af78119A45941ACfD125d", // Ivan
    "0x8e19a318A10Fc39500029aa9D2CaC04f485846e7", // John
    "0xc7f20dD830e0C832d9fABB6a6c3dD16513820Adf", // Luka
    "0xa1A53DC46c6067a85bB08eB0e478063C6236dB31", // Peter
  ];

  await sales.approveBuyers(addresses);

  /*
  await sales.start();
  await sales.batchClaim(addresses);
 */
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
