import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS } from "./constants";
import {
  DAI__factory,
  PEncountr__factory,
  EncountrTreasury__factory,
} from "../typechain";

const hre: HardhatRuntimeEnvironment = require("hardhat");

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const daiDeployment = await deployments.get(CONTRACTS.DAI);
  const dai = await DAI__factory.connect(daiDeployment.address, signer);

  const addresses = {
    // "0x309BE61D5d4Bcc3d22EE99a04019616a835aA918": 33000000, // Aaron
    "0x744f7B6c2f65385e5D5af78119A45941ACfD125d": 74250000, // Ivan
    // "0x8e19a318A10Fc39500029aa9D2CaC04f485846e7": 74250000, // John
    // "0xc7f20dD830e0C832d9fABB6a6c3dD16513820Adf": 74250000, // Luka
    // "0xa1A53DC46c6067a85bB08eB0e478063C6236dB31": 74250000, // Peter
  };

  for (const [address, amount] of Object.entries(addresses)) {
    await dai.mint(
      address,
      ethers.BigNumber.from(amount).mul(
        ethers.BigNumber.from(10).pow(await dai.decimals())
      )
    );
  }

  const t = await deployments.get(CONTRACTS.treasury);
  const treasury = await EncountrTreasury__factory.connect(
    t.address,
    signer
  );
  const amount = ethers.BigNumber.from(9000).mul(
    ethers.BigNumber.from(10).pow(await dai.decimals())
  );
  await dai.approve(treasury.address, amount);
  await treasury.deposit(
    amount,
    dai.address,
    // 9000000000000,
    0,
  );

  /*
  const pEnctrDeployment = await deployments.get(CONTRACTS.pEnctr);
  const pEnctr = await PEncountr__factory.connect(
    pEnctrDeployment.address,
    signer
  );

  for (const [address, amount] of Object.entries(addresses)) {
    await pEnctr.transfer(
      address,
      ethers.BigNumber.from(amount).mul(
        ethers.BigNumber.from(10).pow(await pEnctr.decimals())
      )
    );
  }
 */
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
