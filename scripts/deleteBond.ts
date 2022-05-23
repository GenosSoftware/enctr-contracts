import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import { EncountrBondDepository__factory } from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const depoDeployment = await deployments.get(CONTRACTS.bondDepo);
  const depContract = await EncountrBondDepository__factory.connect(
    depoDeployment.address,
    signer
  );

  await depContract.close(1);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
