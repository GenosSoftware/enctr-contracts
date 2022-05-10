import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONTRACTS } from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const sEnctrDeployment = await deployments.get(CONTRACTS.sEnctr);

    await deploy(CONTRACTS.gEnctr, {
        from: deployer,
        args: [sEnctrDeployment.address],
        log: true,
        skipIfAlreadyDeployed: true,
    });
};

func.tags = [CONTRACTS.gEnctr, "tokens"];
func.dependencies = [CONTRACTS.sEnctr];

export default func;
