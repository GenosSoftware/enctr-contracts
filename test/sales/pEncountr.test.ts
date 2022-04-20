import { expect } from "chai";
import { ethers } from "hardhat";

describe("pEncountr", function () {
  let pEncountr: any;

  let owner: any;
  let buyerAccounts: any[];

  const one = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

  beforeEach(async function () {
    [owner, ...buyerAccounts] = await ethers.getSigners();

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
    const p = await ethers.getContractFactory("pEncountr");
    pEncountr = await p.deploy(authority.address);
    await pEncountr.deployed();
  });

  it("owner can transfer pENCTR", async function () {
    await pEncountr.transfer(buyerAccounts[0].address, one);
  });

  it("non-owners cannot transfer pENCTR without approval", async function () {
    await pEncountr.transfer(buyerAccounts[0].address, one);
    await expect(
      pEncountr
        .connect(buyerAccounts[0])
        .transfer(buyerAccounts[1].address, one)
    ).to.be.revertedWith("not approved to transfer pENCTR.");
  });

  it("non-owners can transfer pENCTR with approval", async function () {
    await pEncountr.transfer(buyerAccounts[0].address, one);
    await pEncountr.addApprovedSeller(buyerAccounts[0].address);
    await pEncountr
      .connect(buyerAccounts[0])
      .transfer(buyerAccounts[1].address, one);
  });

  it("residing approval prevents transfer", async function () {
    await pEncountr.transfer(buyerAccounts[0].address, one);
    await pEncountr.addApprovedSeller(buyerAccounts[0].address);
    await pEncountr.removeApprovedSeller(buyerAccounts[0].address);
    await expect(
      pEncountr
        .connect(buyerAccounts[0])
        .transfer(buyerAccounts[1].address, one)
    ).to.be.revertedWith("not approved to transfer pENCTR.");
  });

  it("disable minting prevents minting", async function () {
    await pEncountr.mint(buyerAccounts[0].address, one);
    expect(await pEncountr.balanceOf(buyerAccounts[0].address)).to.equal(one);
    await pEncountr.disableMinting();
    await expect(
      pEncountr.mint(buyerAccounts[0].address, one)
    ).to.be.revertedWith("Minting has been disabled.");
  });

  it("trading should be openable", async function () {
    await pEncountr.transfer(buyerAccounts[0].address, one);
    await pEncountr.allowOpenTrading();
    await pEncountr
      .connect(buyerAccounts[0])
      .transfer(buyerAccounts[1].address, one);
  });

  it("mass approval and disapproval work", async function () {
    const addresses = [];
    for (const a of buyerAccounts) {
      await pEncountr.transfer(a.address, one);
      addresses.push(a.address);
    }

    await pEncountr.addApprovedSellers(addresses);

    for (let i = 0; i < buyerAccounts.length; i++) {
      await pEncountr
        .connect(buyerAccounts[i])
        .transfer(buyerAccounts[(i + 1) % buyerAccounts.length].address, one);
    }

    await pEncountr.removeApprovedSellers(addresses);

    for (let i = 0; i < buyerAccounts.length; i++) {
      await expect(
        pEncountr
          .connect(buyerAccounts[i])
          .transfer(buyerAccounts[(i + 1) % buyerAccounts.length].address, one)
      ).to.be.revertedWith("not approved to transfer pENCTR.");
    }
  });
});
