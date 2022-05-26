import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import { EncountrAuthority__factory } from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const authorityDeployment = await deployments.get(CONTRACTS.authority);
  const authorityContract = await EncountrAuthority__factory.connect(
    authorityDeployment.address,
    signer
  );

  await authorityContract.pushPolicy(
    "0xc7f20dD830e0C832d9fABB6a6c3dD16513820Adf",
    true
  );

  await authorityContract.pushGuardian(
    "0xc7f20dD830e0C832d9fABB6a6c3dD16513820Adf",
    true
  );

  await authorityContract.pushGovernor(
    "0xc7f20dD830e0C832d9fABB6a6c3dD16513820Adf",
    true
  );
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
