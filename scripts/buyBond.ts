import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import { EncountrBondDepository__factory, DAI__factory } from "../typechain";
import { BigNumber } from "ethers";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const daiDeployment = await deployments.get(CONTRACTS.DAI);
  const dai = await DAI__factory.connect(daiDeployment.address, signer);

  const depoDeployment = await deployments.get(CONTRACTS.bondDepo);
  const depContract = await EncountrBondDepository__factory.connect(
    depoDeployment.address,
    signer
  );

  const markets = await depContract.liveMarkets();
  console.log(markets);

  const amount = "5000000000000000000";
  await dai.approve(depContract.address, amount);
  await depContract.deposit(
    markets[markets.length - 1],
    amount,
    3000000000,
    deployer,
    deployer
  );
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
