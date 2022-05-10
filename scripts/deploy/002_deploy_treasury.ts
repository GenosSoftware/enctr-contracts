import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONTRACTS, TREASURY_TIMELOCK } from "../constants";
import { EncountrAuthority__factory } from "../../typechain";
import { waitFor } from "../txHelper"; // eslint-disable-line node/no-missing-import

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(deployer);

  const encountrDeployment = await deployments.get(CONTRACTS.encountr);
  const authorityDeployment = await deployments.get(CONTRACTS.authority);

  const treasuryDeployment = await deploy(CONTRACTS.treasury, {
    from: deployer,
    args: [
      encountrDeployment.address,
      TREASURY_TIMELOCK,
      authorityDeployment.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const authorityContract = await EncountrAuthority__factory.connect(
    authorityDeployment.address,
    signer
  );

  await waitFor(authorityContract.pushVault(treasuryDeployment.address, true));
  console.log("Setup -- authorityContract.pushVault: set vault on authority");
};

func.tags = [CONTRACTS.treasury, "treasury"];
func.dependencies = [CONTRACTS.encountr];

export default func;
