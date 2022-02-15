// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // "Encountr"
  // TODO: Use our actual token once the Olympus fork is complete.
  const ERC20 = await ethers.getContractFactory("MockERC20");
  const erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 1e10);

  await erc20.deployed();
  console.log("Encountr deployed to:", erc20.address);

  // BattleScape
  const BattleScape = await ethers.getContractFactory("BattleScape");
  const battlescape = await upgrades.deployProxy(BattleScape, [erc20.address]);

  await battlescape.deployed();
  console.log("BattleScape proxy deployed to:", battlescape.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
