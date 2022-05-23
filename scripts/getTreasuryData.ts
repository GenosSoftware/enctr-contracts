import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import {
  EncountrTreasury__factory,
  EncountrERC20Token__factory,
  EncountrBondDepository__factory,
} from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
  const treasury = await EncountrTreasury__factory.connect(
    treasuryDeployment.address,
    signer
  );

  const encountrDeployment = await deployments.get(CONTRACTS.encountr);
  const e = await EncountrERC20Token__factory.connect(
    encountrDeployment.address,
    signer
  );

  const depoDeployment = await deployments.get(CONTRACTS.bondDepo);
  const depContract = await EncountrBondDepository__factory.connect(
    depoDeployment.address,
    signer
  );

  console.log("Total Reserves", await treasury.totalReserves());
  console.log("Total Debt", await treasury.totalDebt());
  console.log("Excess Reserves", await treasury.excessReserves());
  console.log("ENCTR supply", await e.totalSupply());
  console.log("marketPrice", await depContract.marketPrice(4));
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
