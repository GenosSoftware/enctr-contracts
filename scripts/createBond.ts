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

  const daiDeployment = await deployments.get(CONTRACTS.DAI);

  await depContract.create(
    daiDeployment.address,
    ["100000000000000000000", "3000000000", "100000"],
    [true, true],
    [1200, 1653529229],
    [36000, 7200000]
  );
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
