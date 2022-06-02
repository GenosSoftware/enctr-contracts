import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import {
  EncountrERC20Token__factory,
  DAI__factory,
  Distributor__factory,
} from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers, network } = hre;
  const { deployer, dai } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const enctrDeployment = await deployments.get(CONTRACTS.encountr);
  const enctr = await EncountrERC20Token__factory.connect(
    enctrDeployment.address,
    signer
  );

  let daiAddress = dai;
  if (network.name !== "mainnet") {
    daiAddress = (await deployments.get(CONTRACTS.DAI)).address;
  }

  const daiContract = await DAI__factory.connect(daiAddress, signer);
  const rfv = await daiContract.balanceOf(
    (
      await deployments.get(CONTRACTS.treasury)
    ).address
  );

  const totalSupply = (await enctr.totalSupply()).mul(
    ethers.BigNumber.from(10).pow(9)
  );

  const runway = Number.parseFloat(rfv.div(totalSupply).toString());
  const nextEpochRebase = 0.004;

  const runwayCurrent = Math.log(runway) / Math.log(1 + nextEpochRebase) / 3;
  console.log(runwayCurrent);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
