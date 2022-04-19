import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONTRACTS } from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const authorityDeployment = await deployments.get(CONTRACTS.authority);
  const encountrDeployment = await deployments.get(CONTRACTS.encountr);
  const gEncountrDeployment = await deployments.get(CONTRACTS.gEnctr);
  const stakingDeployment = await deployments.get(CONTRACTS.staking);
  const treasuryDeployment = await deployments.get(CONTRACTS.treasury);

  await deploy(CONTRACTS.bondDepo, {
    from: deployer,
    args: [
      authorityDeployment.address,
      encountrDeployment.address,
      gEncountrDeployment.address,
      stakingDeployment.address,
      treasuryDeployment.address,
    ],
    log: true,
  });
};

func.tags = [CONTRACTS.bondDepo, "bonding"];
func.dependencies = [
  CONTRACTS.authority,
  CONTRACTS.encountr,
  CONTRACTS.gEnctr,
  CONTRACTS.staking,
  CONTRACTS.treasury,
];

export default func;
