import { expect } from "chai";
import { ethers } from "hardhat";
import { smock } from "@defi-wonderland/smock";

describe("EncountrPresale", function () {
  let erc20: any;
  let eDecimals: number;
  let stablecoin: any;
  let sDecimals: number;
  let treasury: any;
  let sales: any;

  let enctrPrice: any;
  let minEnctr: any;
  let maxEnctr: any;

  let owner: any;
  let buyerAccounts: any[];

  beforeEach(async function () {
    [owner, ...buyerAccounts] = await ethers.getSigners();

    const mintAmount = "100000000000000000000000000000000";

    // Mock stablecoin
    const sc = await smock.mock("MockERC20");
    stablecoin = await sc.deploy("MockDAI", "tDAI", 18);
    await stablecoin.deployed();
    await stablecoin.mint(owner.address, mintAmount);
    sDecimals = await stablecoin.decimals();

    // ERC20
    const ERC20 = await smock.mock("MockERC20");
    erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 9);
    await erc20.deployed();
    await erc20.mint(owner.address, mintAmount);
    eDecimals = await erc20.decimals();

    // Authority
    const a = await ethers.getContractFactory("EncountrAuthority");
    const authority = await a.deploy(
      owner.address,
      owner.address,
      owner.address,
      owner.address
    );
    await authority.deployed();

    // Treasury
    const t = await ethers.getContractFactory("EncountrTreasury");
    treasury = await t.deploy(erc20.address, 0, authority.address);
    await treasury.deployed();
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    await treasury.enable("2", stablecoin.address, ZERO_ADDRESS);

    // EncountrPresale
    enctrPrice = ethers.BigNumber.from(4).mul(
      ethers.BigNumber.from(10).pow(sDecimals)
    );
    minEnctr = ethers.BigNumber.from(75).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    maxEnctr = ethers.BigNumber.from(750).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const s = await ethers.getContractFactory("EncountrPresale");
    sales = await s.deploy(
      authority.address,
      treasury.address,
      minEnctr,
      maxEnctr,
      stablecoin.address,
      erc20.address,
      enctrPrice
    );
    await sales.deployed();
    await treasury.enable("0", sales.address, ZERO_ADDRESS);
  });

  it("only owners can start and stop sales", async function () {
    await expect(sales.connect(buyerAccounts[0]).start()).to.be.revertedWith(
      "UNAUTHORIZED"
    );
    await sales.start();

    await expect(sales.connect(buyerAccounts[0]).stop()).to.be.revertedWith(
      "UNAUTHORIZED"
    );
    await sales.stop();

    await expect(sales.connect(buyerAccounts[0]).finish()).to.be.revertedWith(
      "UNAUTHORIZED"
    );
    await sales.finish();
  });

  it("cannot stop without starting", async function () {
    await expect(sales.stop()).to.be.revertedWith(
      "this sale has already stopped."
    );
  });

  it("cannot finish without stopping", async function () {
    await sales.start();
    await expect(sales.finish()).to.be.revertedWith("this sale is ongoing.");
  });

  it("cannot start after finishing", async function () {
    await sales.finish();
    await expect(sales.start()).to.be.revertedWith(
      "this sale has already finished."
    );
  });

  it("only approved buyers are allowed", async function () {
    const amountToBuy = ethers.BigNumber.from(76).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const amountToSpend = enctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToSpend
    );
    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);

    await sales.start();
    await expect(
      sales.connect(buyerAccounts[0]).buy(amountToBuy)
    ).to.be.revertedWith("buyer not approved");

    await sales.approveBuyer(buyerAccounts[0].address);
    await sales.connect(buyerAccounts[0]).buy(amountToBuy);

    expect(await stablecoin.balanceOf(sales.address)).to.equal(amountToSpend);
    expect(
      amountToSpend.div(ethers.BigNumber.from(10).pow(sDecimals))
    ).to.equal(304);
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(0);
    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(0);

    /*
    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToBuy
    );
    expect(amountToBuy.div(ethers.BigNumber.from(10).pow(eDecimals))).to.equal(
      10
    );
    */
  });

  it("cannot refund multiple times", async function () {
    const amountToBuy = ethers.BigNumber.from(76).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const amountToSpend = enctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToSpend
    );
    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);

    await sales.approveBuyer(buyerAccounts[0].address);
    await sales.start();
    await sales.connect(buyerAccounts[0]).buy(amountToBuy);
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(0);
    await sales.connect(buyerAccounts[0]).refund();
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToSpend
    );
    await expect(sales.connect(buyerAccounts[0]).refund()).to.be.revertedWith(
      "nothing to refund."
    );
  });

  it("cannot refund without purchase", async function () {
    await sales.start();
    await expect(sales.connect(buyerAccounts[0]).refund()).to.be.revertedWith(
      "nothing to refund."
    );
    await sales.stop();
    await expect(sales.connect(buyerAccounts[0]).refund()).to.be.revertedWith(
      "nothing to refund."
    );
    await sales.finish();
    await expect(sales.connect(buyerAccounts[0]).refund()).to.be.revertedWith(
      "nothing to refund."
    );
  });

  it("cannot buy before sale starts", async function () {
    await sales.approveBuyer(buyerAccounts[0].address);
    await expect(sales.connect(buyerAccounts[0]).buy(1e10)).to.be.revertedWith(
      "sale is not active"
    );
  });

  it("cannot buy after sale ends or is finished", async function () {
    await sales.approveBuyer(buyerAccounts[0].address);
    await sales.start();
    await sales.stop();
    await expect(sales.connect(buyerAccounts[0]).buy(1e10)).to.be.revertedWith(
      "sale is not active"
    );
    await sales.finish();
    await expect(sales.connect(buyerAccounts[0]).buy(1e10)).to.be.revertedWith(
      "sale is not active"
    );
  });

  it("mass approve buyers", async function () {
    const amountToBuy = ethers.BigNumber.from(76).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const amountToSpend = enctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await sales.start();

    const addresses = [buyerAccounts[0], buyerAccounts[1], buyerAccounts[2]];
    for (let i = 0; i < addresses.length; i++) {
      await expect(
        sales.connect(addresses[i]).buy(amountToBuy)
      ).to.be.revertedWith("buyer not approved");
    }

    await sales.approveBuyers(addresses.map((account) => account.address));

    for (let i = 0; i < addresses.length; i++) {
      await stablecoin.transfer(addresses[i].address, amountToSpend);
      await stablecoin
        .connect(addresses[i])
        .approve(sales.address, amountToSpend);
      await sales.connect(addresses[i]).buy(amountToBuy);
    }
  });

  it("can withdraw tokens", async function () {
    const balance = await stablecoin.balanceOf(owner.address);
    await stablecoin.transfer(sales.address, 1);
    expect(await stablecoin.balanceOf(sales.address)).to.equal(1);
    expect(await stablecoin.balanceOf(owner.address)).to.equal(balance.sub(1));

    await expect(
      sales.connect(buyerAccounts[0]).withdrawTokens(stablecoin.address)
    ).to.be.revertedWith("UNAUTHORIZED");
    sales.withdrawTokens(stablecoin.address);
    expect(await stablecoin.balanceOf(sales.address)).to.equal(0);
    expect(await stablecoin.balanceOf(owner.address)).to.equal(balance);
  });

  it("cannot buy more than max or less than min for sale", async function () {
    let amount = maxEnctr.add(1);
    await stablecoin.transfer(buyerAccounts[0].address, amount);
    await stablecoin.connect(buyerAccounts[0]).approve(sales.address, amount);

    await sales.approveBuyer(buyerAccounts[0].address);
    await sales.start();

    await expect(
      sales.connect(buyerAccounts[0]).buy(amount)
    ).to.be.revertedWith("above maximum for sale");

    amount = minEnctr.sub(1);
    await expect(
      sales.connect(buyerAccounts[0]).buy(amount)
    ).to.be.revertedWith("below minimum for sale");
  });

  it("can claim purchased tokens only after sale is finished", async function () {
    const amountToBuy = ethers.BigNumber.from(76).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const amountToSpend = enctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);

    await sales.approveBuyer(buyerAccounts[0].address);
    await sales.start();
    await sales.connect(buyerAccounts[0]).buy(amountToBuy);

    await expect(sales.connect(buyerAccounts[0]).claim()).to.be.revertedWith(
      "this sale is not been finalized."
    );
    await sales.stop();
    await sales.finish();
    await sales.connect(buyerAccounts[0]).claim();
    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToBuy
    );
  });

  it("can claim for someone else", async function () {
    const amountToBuy = ethers.BigNumber.from(76).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const amountToSpend = enctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);

    await sales.approveBuyer(buyerAccounts[0].address);
    await sales.start();
    await sales.connect(buyerAccounts[0]).buy(amountToBuy);

    await sales.stop();
    await sales.finish();
    await sales.batchClaim([buyerAccounts[0].address]);
    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToBuy
    );
  });

  it("cannot claim without order", async function () {
    await sales.start();
    await sales.stop();
    await sales.finish();
    await expect(sales.connect(buyerAccounts[0]).claim()).to.be.revertedWith(
      "this address has not ordered."
    );
  });
});
