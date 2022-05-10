import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  CONTRACTS,
  EPOCH_LENGTH_IN_BLOCKS,
  FIRST_EPOCH_TIME,
  FIRST_EPOCH_NUMBER,
} from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const authorityDeployment = await deployments.get(CONTRACTS.authority);
  const encountrDeployment = await deployments.get(CONTRACTS.encountr);
  const sEnctrDeployment = await deployments.get(CONTRACTS.sEnctr);
  const gEnctrDeployment = await deployments.get(CONTRACTS.gEnctr);

  await deploy(CONTRACTS.staking, {
    from: deployer,
    args: [
      encountrDeployment.address,
      sEnctrDeployment.address,
      gEnctrDeployment.address,
      EPOCH_LENGTH_IN_BLOCKS,
      FIRST_EPOCH_NUMBER,
      FIRST_EPOCH_TIME,
      authorityDeployment.address,
    ],
    log: true,
  });
};

func.tags = [CONTRACTS.staking, "staking"];
func.dependencies = [
  CONTRACTS.authority,
  CONTRACTS.encountr,
  CONTRACTS.sEnctr,
  CONTRACTS.gEnctr,
];

export default func;
