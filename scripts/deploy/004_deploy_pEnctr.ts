import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types"; // eslint-disable-line node/no-missing-import
import { CONTRACTS } from "../constants"; // eslint-disable-line node/no-missing-import

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer, dai } = await getNamedAccounts();

  const enctrDeployment = await deployments.get(CONTRACTS.encountr);
  const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
  const authorityDeployment = await deployments.get(CONTRACTS.authority);

  await deploy(CONTRACTS.pEnctr, {
    from: deployer,
    args: [authorityDeployment.address],
    log: true,
  });

  const pEnctrDeployment = await deployments.get(CONTRACTS.pEnctr);

  let daiAddress = dai;
  if (!network.tags.production) {
    daiAddress = (await deployments.get(CONTRACTS.DAI)).address;
  }

  await deploy(CONTRACTS.vesting, {
    from: deployer,
    args: [
      enctrDeployment.address,
      pEnctrDeployment.address,
      daiAddress,
      treasuryDeployment.address,
      authorityDeployment.address,
    ],
    log: true,
  });
};

func.tags = [CONTRACTS.pEnctr, CONTRACTS.vesting];
func.dependencies = [CONTRACTS.treasury, CONTRACTS.authority];

export default func;
