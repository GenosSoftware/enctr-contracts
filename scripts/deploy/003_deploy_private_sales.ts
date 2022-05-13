import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONTRACTS } from "../constants";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers, network } = hre;
  const { deploy } = deployments;
  const { deployer, dai } = await getNamedAccounts();

  const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
  const authorityDeployment = await deployments.get(CONTRACTS.authority);
  const encountrDeployment = await deployments.get(CONTRACTS.encountr);

  const enctrPrice = ethers.BigNumber.from(4).mul(
    ethers.BigNumber.from(10).pow(18)
  );
  const minEnctr = ethers.BigNumber.from(75).mul(
    ethers.BigNumber.from(10).pow(9)
  );
  const maxEnctr = ethers.BigNumber.from(750).mul(
    ethers.BigNumber.from(10).pow(9)
  );

  let daiAddress = dai;
  if (network.name !== "mainnet") {
    daiAddress = (await deployments.get(CONTRACTS.DAI)).address;
  }

  await deploy(CONTRACTS.sales, {
    from: deployer,
    args: [
      authorityDeployment.address,
      treasuryDeployment.address,
      minEnctr,
      maxEnctr,
      daiAddress,
      encountrDeployment.address,
      enctrPrice,
    ],
    log: true,
  });
};

func.tags = [CONTRACTS.sales, "sales"];
func.dependencies = [
  CONTRACTS.encountr,
  CONTRACTS.treasury,
  CONTRACTS.authority
];

export default func;
