import { expect } from "chai";
import { ethers } from "hardhat";
import { smock } from "@defi-wonderland/smock";

describe("ExercisepENCTR", function () {
  let ENCTR: any;
  let pENCTR: any;
  let decimals: number;
  let stablecoin: any;
  let treasury: any;
  let vesting: any;

  let owner: any;
  let teamMember: any;
  let others: any[];

  beforeEach(async function () {
    [owner, teamMember, ...others] = await ethers.getSigners();

    const mintAmount = ethers.BigNumber.from("1")
      .mul(ethers.BigNumber.from(10).pow(9))
      .mul(ethers.BigNumber.from(10).pow(18));

    // Mock stablecoin
    const sc = await smock.mock("MockERC20");
    stablecoin = await sc.deploy("MockDAI", "DAI", 18);
    await stablecoin.deployed();
    await stablecoin.mint(owner.address, mintAmount);

    // Mock Encountr
    const enctr = await smock.mock("MockERC20");
    ENCTR = await enctr.deploy("MockEncountr", "ENCTR", 9);
    await ENCTR.deployed();
    decimals = await ENCTR.decimals();

    // Authority
    const a = await ethers.getContractFactory("EncountrAuthority");
    const authority = await a.deploy(
      owner.address,
      owner.address,
      owner.address,
      owner.address
    );
    await authority.deployed();

    // pEncountr
    const penctr = await ethers.getContractFactory("pEncountr");
    pENCTR = await penctr.deploy(authority.address);
    await pENCTR.deployed();
    await pENCTR.mint(owner.address, mintAmount);

    // Treasury
    const t = await ethers.getContractFactory("EncountrTreasury");
    treasury = await t.deploy(ENCTR.address, 0, authority.address);
    await treasury.deployed();
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    await treasury.enable("2", stablecoin.address, ZERO_ADDRESS);

    // ExercisepENCTR
    const e = await ethers.getContractFactory("ExercisepENCTR");
    vesting = await e.deploy(
      ENCTR.address,
      pENCTR.address,
      stablecoin.address,
      treasury.address,
      authority.address
    );
    await vesting.deployed();
    await treasury.enable("0", vesting.address, ZERO_ADDRESS);
  });

  it("should disallow unapproved addresses", async function () {
    await expect(
      vesting.setTerms(teamMember.address, 1, 1, 1)
    ).to.be.revertedWith("the vester has not been approved");
  });

  it("should disallow lowering terms", async function () {
    const vestingRate = ethers.BigNumber.from(75000); // 7.5%
    const maxTokens = ethers.BigNumber.from(75_000_000).mul(
      ethers.BigNumber.from(10).pow(decimals)
    ); // 75,000,000 ENCTR

    await pENCTR.addApprovedSeller(teamMember.address);
    await vesting.setTerms(teamMember.address, vestingRate, 1, maxTokens);

    await expect(
      vesting.setTerms(teamMember.address, vestingRate, 1, maxTokens.sub(1))
    ).to.be.revertedWith("cannot lower amount claimable");
    await expect(
      vesting.setTerms(teamMember.address, vestingRate.sub(1), 1, maxTokens)
    ).to.be.revertedWith("cannot lower vesting rate");
    await expect(
      vesting.setTerms(teamMember.address, vestingRate, 0, maxTokens)
    ).to.be.revertedWith("cannot lower claimed");
  });

  it("should vest with supply", async function () {
    const vestingRate = ethers.BigNumber.from(75000); // 7.5%
    const maxTokens = ethers.BigNumber.from(75_000_000).mul(
      ethers.BigNumber.from(10).pow(decimals)
    ); // 75,000,000 ENCTR

    await pENCTR.transfer(teamMember.address, maxTokens);
    await pENCTR.addApprovedSeller(teamMember.address);
    await vesting.setTerms(teamMember.address, vestingRate, 0, maxTokens);

    for (let i = 100_000_000_000; i <= 1_000_000_000_000_000_000; i *= 10) {
      await ENCTR.mint(
        owner.address,
        ethers.BigNumber.from(i.toString()).sub(await ENCTR.totalSupply())
      );

      const terms = await vesting.terms(teamMember.address);
      const claimed = terms.claimed;
      const share = parseInt((i * 0.075).toFixed()) - claimed;
      const maxAllowedThisRound = ethers.BigNumber.from(share.toString());

      expect(await vesting.redeemableFor(teamMember.address)).to.equal(
        maxAllowedThisRound
      );

      await stablecoin.transfer(teamMember.address, maxAllowedThisRound);
      await stablecoin
        .connect(teamMember)
        .approve(vesting.address, maxAllowedThisRound);
      await pENCTR
        .connect(teamMember)
        .approve(vesting.address, maxAllowedThisRound);
      await expect(
        vesting.connect(teamMember).exercise(maxAllowedThisRound.add(1))
      ).to.be.revertedWith("Not enough vested");
      await vesting.connect(teamMember).exercise(maxAllowedThisRound);
    }

    await expect(vesting.connect(teamMember).exercise(1)).to.be.revertedWith(
      "Claimed over max"
    );
  });

  it("should be able to change wallet if pushed", async function () {
    const vestingRate = ethers.BigNumber.from(75000); // 7.5%
    const maxTokens = ethers.BigNumber.from(75_000_000).mul(
      ethers.BigNumber.from(10).pow(decimals)
    ); // 75,000,000 ENCTR

    await pENCTR.transfer(teamMember.address, maxTokens);
    await pENCTR.addApprovedSeller(teamMember.address);
    await vesting.setTerms(teamMember.address, vestingRate, 0, maxTokens);

    const oldTerms = await vesting.terms(teamMember.address);

    await vesting.connect(teamMember).pushWalletChange(others[0].address);
    await vesting.connect(others[0]).pullWalletChange(teamMember.address);
    await pENCTR
      .connect(teamMember)
      .transfer(others[0].address, await pENCTR.balanceOf(teamMember.address));

    const newTerms = await vesting.terms(others[0].address);
    expect(newTerms.percent).to.equal(oldTerms.percent);
    expect(newTerms.claimed).to.equal(oldTerms.claimed);
    expect(newTerms.max).to.equal(oldTerms.max);

    const clearedTerms = await vesting.terms(teamMember.address);
    expect(clearedTerms.percent).to.equal(0);
    expect(clearedTerms.claimed).to.equal(0);
    expect(clearedTerms.max).to.equal(0);

    expect(await pENCTR.balanceOf(teamMember.address)).to.equal(0);
    expect(await pENCTR.balanceOf(others[0].address)).to.equal(maxTokens);
  });

  it("should not pull non-pushed wallet", async function () {
    await expect(
      vesting.connect(others[0]).pullWalletChange(teamMember.address)
    ).to.be.revertedWith("wallet did not push");
  });

  it("should not overwrite terms", async function () {
    await expect(
      vesting.connect(teamMember).pushWalletChange(teamMember.address)
    ).to.be.revertedWith("must specify a new wallet");
  });

  it("should not push a non-vested wallet", async function () {
    await expect(
      vesting.connect(others[0]).pushWalletChange(teamMember.address)
    ).to.be.revertedWith("not a participating wallet");
  });
});
