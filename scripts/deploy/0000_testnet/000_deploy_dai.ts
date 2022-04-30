import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types"; // eslint-disable-line node/no-missing-import

import { CONTRACTS } from "../../constants"; // eslint-disable-line node/no-missing-import

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre;

  if (network.name === "mainnet") {
    console.log("DAI cannot be deployed to mainnet");
    return;
  }

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy(CONTRACTS.DAI, {
    from: deployer,
    args: [0],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = [CONTRACTS.DAI, "testnet"];
