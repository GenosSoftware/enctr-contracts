import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types"; // eslint-disable-line node/no-missing-import
import { CONTRACTS, INITIAL_MINT, INITIAL_MINT_PROFIT } from "../../constants"; // eslint-disable-line node/no-missing-import
import {
  EncountrERC20Token__factory, // eslint-disable-line camelcase
  EncountrTreasury__factory, // eslint-disable-line camelcase
  DAI__factory, // eslint-disable-line camelcase
} from "../../../typechain"; // eslint-disable-line node/no-missing-import
import { waitFor } from "../../txHelper"; // eslint-disable-line node/no-missing-import

const faucetContract = "EnctrFaucet";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network, ethers } = hre;

  if (network.name === "mainnet") {
    console.log("Faucet cannot be deployed to mainnet");
    return;
  }

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const encountrDeployment = await deployments.get(CONTRACTS.encountr);
  const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
  const daiDeployment = await deployments.get(CONTRACTS.DAI);

  const encountr = EncountrERC20Token__factory.connect(
    encountrDeployment.address,
    signer
  );
  const mockDai = DAI__factory.connect(daiDeployment.address, signer);
  const treasury = EncountrTreasury__factory.connect(
    treasuryDeployment.address,
    signer
  );

  // Deploy Faucuet
  await deploy(faucetContract, {
    from: deployer,
    args: [encountrDeployment.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
  const faucetDeployment = await deployments.get(faucetContract);

  let faucetBalance = await encountr.balanceOf(faucetDeployment.address);
  const minEnctr = ethers.BigNumber.from(10000 * 1e9);
  if (faucetBalance.gt(minEnctr)) {
    // short circuit if faucet balance is above 10k encountr
    console.log("Sufficient faucet balance");
    console.log("Faucet Balance: ", faucetBalance.toString());
    return;
  }
  // Mint Dai
  const daiAmount = INITIAL_MINT;
  await waitFor(mockDai.mint(deployer, daiAmount));
  const daiBalance = await mockDai.balanceOf(deployer);
  console.log("Dai minted: ", daiBalance.toString());

  // Treasury Actions
  await waitFor(treasury.enable(0, deployer, ethers.constants.AddressZero)); // Enable the deployer to deposit reserve tokens
  await waitFor(
    treasury.enable(2, daiDeployment.address, ethers.constants.AddressZero)
  ); // Enable Dai as a reserve Token

  // Deposit and mint encountr
  await waitFor(mockDai.approve(treasury.address, daiAmount)); // Approve treasury to use the dai
  await waitFor(
    treasury.deposit(daiAmount, daiDeployment.address, INITIAL_MINT_PROFIT)
  ); // Deposit Dai into treasury, with a profit set, so that we have reserves for staking
  const encountrMinted = await encountr.balanceOf(deployer);
  console.log("Enctr minted: ", encountrMinted.toString());

  // Fund faucet w/ newly minted dai.
  // await waitFor(encountr.approve(faucetDeployment.address, encountrMinted));
  await waitFor(encountr.transfer("0xa1A53DC46c6067a85bB08eB0e478063C6236dB31", encountrMinted));

  faucetBalance = await encountr.balanceOf(faucetDeployment.address);
  console.log("Faucet balance:", faucetBalance.toString());
};

func.tags = ["faucet", "testnet"];
func.dependencies = [CONTRACTS.encountr, CONTRACTS.DAI, CONTRACTS.treasury];
func.runAtTheEnd = true;

export default func;
