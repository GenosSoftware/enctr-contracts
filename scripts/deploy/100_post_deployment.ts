import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { waitFor } from "../txHelper";
import { CONTRACTS, INITIAL_REWARD_RATE, INITIAL_INDEX, BOUNTY_AMOUNT } from "../constants";
import {
    EncountrAuthority__factory,
    Distributor__factory,
    EncountrERC20Token__factory,
    EncountrStaking__factory,
    SEncountr__factory,
    GENCTR__factory,
    EncountrTreasury__factory,
    EncountrBondDepository__factory,
} from "../../typechain";

// TODO: Shouldn't run setup methods if the contracts weren't redeployed.
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.provider.getSigner(deployer);

    const authorityDeployment = await deployments.get(CONTRACTS.authority);
    const encountrDeployment = await deployments.get(CONTRACTS.encountr);
    const sEnctrDeployment = await deployments.get(CONTRACTS.sEnctr);
    const gEnctrDeployment = await deployments.get(CONTRACTS.gEnctr);
    const distributorDeployment = await deployments.get(CONTRACTS.distributor);
    const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
    const stakingDeployment = await deployments.get(CONTRACTS.staking);
    const bondDepoDeployment = await deployments.get(CONTRACTS.bondDepo);

    const authorityContract = await EncountrAuthority__factory.connect(
        authorityDeployment.address,
        signer
    );
    const encountr = EncountrERC20Token__factory.connect(encountrDeployment.address, signer);
    const sEnctr = SEncountr__factory.connect(sEnctrDeployment.address, signer);
    const gEnctr = GENCTR__factory.connect(gEnctrDeployment.address, signer);
    const distributor = Distributor__factory.connect(distributorDeployment.address, signer);
    const staking = EncountrStaking__factory.connect(stakingDeployment.address, signer);
    const treasury = EncountrTreasury__factory.connect(treasuryDeployment.address, signer);
    const bondDepo = EncountrBondDepository__factory.connect(bondDepoDeployment.address, signer);

    // Step 1: Set treasury as vault on authority
    await waitFor(authorityContract.pushVault(treasury.address, true));
    console.log("Setup -- authorityContract.pushVault: set vault on authority");

    // Step 2: Set distributor as minter on treasury
    await waitFor(treasury.enable(8, distributor.address, ethers.constants.AddressZero)); // Allows distributor to mint encountr.
    console.log("Setup -- treasury.enable(8):  distributor enabled to mint encountr on treasury");

    // Step 3: Set distributor on staking
    await waitFor(staking.setDistributor(distributor.address));
    console.log("Setup -- staking.setDistributor:  distributor set on staking");

    // Step 4: Initialize sENCTR and set the index
    if ((await sEnctr.gENCTR()) == ethers.constants.AddressZero) {
        await waitFor(sEnctr.setIndex(INITIAL_INDEX)); // TODO
        await waitFor(sEnctr.setgENCTR(gEnctr.address));
        await waitFor(sEnctr.initialize(staking.address, treasuryDeployment.address));
    }
    console.log("Setup -- sencountr initialized (index, gencountr)");

    // Step 5: Set up distributor with bounty and recipient
    await waitFor(distributor.setBounty(BOUNTY_AMOUNT));
    await waitFor(distributor.addRecipient(staking.address, INITIAL_REWARD_RATE));
    console.log("Setup -- distributor.setBounty && distributor.addRecipient");

    // Approve staking contact to spend deployer's ENCTR
    // TODO: Is this needed?
    // await encountr.approve(staking.address, LARGE_APPROVAL);

    // Step 6: link staking to gENCTR
    if (await !gEnctr.ready()) {
      await waitFor(gEnctr.initialize(staking.address))
    }
    console.log("Setup -- link staking to gENCTR");

    // Step 7: add bond depo
    await waitFor(treasury.enable(8, bondDepo.address, ethers.constants.AddressZero)); // Allows bond depo to mint encountr.
    console.log("Setup -- treasury.enable(8):  bond depo enabled to mint encountr on treasury");
};

func.tags = ["setup"];
func.dependencies = [CONTRACTS.encountr, CONTRACTS.sEnctr, CONTRACTS.gEnctr];

export default func;
