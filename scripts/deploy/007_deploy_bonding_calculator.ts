import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { EncountrERC20Token__factory } from "../../typechain";
import { CONTRACTS } from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const encountrDeployment = await deployments.get(CONTRACTS.encountr);
  const encountr = await EncountrERC20Token__factory.connect(
    encountrDeployment.address,
    signer
  );

  await deploy(CONTRACTS.bondingCalculator, {
    from: deployer,
    args: [encountr.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

func.tags = [CONTRACTS.bondingCalculator, "staking", "bonding"];
func.dependencies = [CONTRACTS.encountr];

export default func;
