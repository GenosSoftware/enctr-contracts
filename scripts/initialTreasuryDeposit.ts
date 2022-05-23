import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import {
  DAI__factory,
  EncountrTreasury__factory,
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

  const daiDeployment = await deployments.get(CONTRACTS.DAI);
  const dai = await DAI__factory.connect(daiDeployment.address, signer);

  await treasury.enable("0", deployer, ethers.constants.AddressZero);
  await treasury.enable(
    "2",
    daiDeployment.address,
    ethers.constants.AddressZero
  );

  const deposit = "49990000000000000000000";
  const profit = "49990000000000";
  await dai.approve(treasury.address, deposit);
  await treasury.deposit(deposit, daiDeployment.address, profit);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
