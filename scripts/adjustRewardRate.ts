import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import {
  Distributor__factory,
} from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const distDeployment = await deployments.get(CONTRACTS.distributor);
  const distributor = await Distributor__factory.connect(
    distDeployment.address,
    signer
  );

  const stakingDeployment = await deployments.get(CONTRACTS.staking);
  // await distributor.setAdjustment(0, false, 2000, 0);
  // await distributor.removeRecipient(0);
  // await distributor.addRecipient(stakingDeployment.address, 0);

  let isSetup = false;
  for (let i = 0; i < 100; i++) {
    try {
      const info = await distributor.info(i);
      if (info.recipient === stakingDeployment.address && info.rate.gt(0)) {
        isSetup = true;
        break;
      }
    } catch (e) {
      console.error(e);
      break;
    }
  }
  console.log("isSetup", isSetup);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
