import { expect } from "chai";
import { ethers } from "hardhat";
import { smock } from "@defi-wonderland/smock";

describe("EncountrPrivateSales", function () {
  let erc20: any;
  let eDecimals: number;
  let stablecoin: any;
  let sDecimals: number;
  let treasury: any;
  let sales: any;

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

    // EncountrPrivateSales
    const s = await ethers.getContractFactory("EncountrPrivateSales");
    sales = await s.deploy(treasury.address, authority.address);
    await sales.deployed();
    await treasury.enable("0", sales.address, ZERO_ADDRESS);

    erc20.transfer(sales.address, 1e10);
  });

  it("zero (0) sale is not allowed", async function () {
    expect(await sales.currentSaleId()).to.equal(0);

    await expect(
      sales.connect(buyerAccounts[0]).buy(await sales.currentSaleId(), 1e10)
    ).to.be.revertedWith("sale is not active");
    await expect(
      sales.approveBuyer(await sales.currentSaleId(), buyerAccounts[0].address)
    ).to.be.revertedWith("sale is not active");
  });

  it("saleId must equal currentSaleId", async function () {
    const expectedEnctrPrice = "4000000000000000000";

    let tx = await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );
    let rc = await tx.wait();
    const [currentSaleId, tokenPrice, saleToken, purchaseToken] =
      rc.events[0].args;
    expect(currentSaleId).to.equal(1);
    expect(currentSaleId).to.equal(await sales.currentSaleId());
    expect(tokenPrice).to.equal(expectedEnctrPrice);
    expect(saleToken).to.equal(erc20.address);
    expect(purchaseToken).to.equal(stablecoin.address);

    await sales.stopSale(currentSaleId);

    tx = await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );
    rc = await tx.wait();
    expect(rc.events[0].args[0]).to.equal(await sales.currentSaleId());
    expect(rc.events[0].args[0]).to.equal(2);
  });

  it("only owners can start and stop sales", async function () {
    await expect(
      sales
        .connect(buyerAccounts[0])
        .createSale(
          "4000000000000000000",
          erc20.address,
          stablecoin.address,
          true,
          1,
          1,
          0
        )
    ).to.be.revertedWith("UNAUTHORIZED");

    await sales.createSale(
      "4000000000000000000",
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );
    await expect(
      sales.connect(buyerAccounts[0]).stopCurrentSale()
    ).to.be.revertedWith("UNAUTHORIZED");
  });

  it("only approved buyers are allowed", async function () {
    const expectedEnctrPrice = ethers.BigNumber.from(4).mul(
      ethers.BigNumber.from(10).pow(sDecimals)
    );
    const amountToBuy = ethers.BigNumber.from(10).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );

    const amountToSpend = expectedEnctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToSpend
    );
    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);

    await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      true,
      amountToBuy,
      amountToBuy,
      0
    );
    await expect(
      sales
        .connect(buyerAccounts[0])
        .buy(await sales.currentSaleId(), amountToBuy)
    ).to.be.revertedWith("buyer not approved");

    await sales.approveBuyer(
      await sales.currentSaleId(),
      buyerAccounts[0].address
    );

    await sales
      .connect(buyerAccounts[0])
      .buy(await sales.currentSaleId(), amountToBuy);

    expect(await stablecoin.balanceOf(treasury.address)).to.equal(
      amountToSpend
    );
    expect(
      amountToSpend.div(ethers.BigNumber.from(10).pow(sDecimals))
    ).to.equal(40);

    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToBuy
    );
    expect(amountToBuy.div(ethers.BigNumber.from(10).pow(eDecimals))).to.equal(
      10
    );
  });

  it("stopped sale is unusable", async function () {
    await sales.createSale(
      "100000000000000000000",
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );
    await sales.approveBuyer(
      await sales.currentSaleId(),
      buyerAccounts[0].address
    );
    await sales.stopSale(await sales.currentSaleId());

    await expect(
      sales.connect(buyerAccounts[0]).buy(await sales.currentSaleId(), 1e10)
    ).to.be.revertedWith("sale is not active");
  });

  it("created sale is properly formatted", async function () {
    const expectedEnctrPrice = "400000000000000000000";
    await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );

    const saleId = await sales.currentSaleId();
    let sale = await sales.sales(saleId);
    expect(sale.active).to.be.true; // eslint-disable-line no-unused-expressions
    expect(sale.id).to.equal(saleId);
    expect(sale.tokenPrice).to.equal(expectedEnctrPrice);
    expect(sale.saleToken).to.equal(erc20.address);
    expect(sale.purchaseToken).to.equal(stablecoin.address);
    expect(sale.isTreasuryDeposit).to.equal(true);

    await sales.stopCurrentSale();

    sale = await sales.sales(saleId);
    expect(sale.active).to.be.false; // eslint-disable-line no-unused-expressions
  });

  it("mass approve buyers", async function () {
    const expectedEnctrPrice = ethers.BigNumber.from(4).mul(
      ethers.BigNumber.from(10).pow(sDecimals)
    );
    const amountToBuy = ethers.BigNumber.from(10).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );

    const amountToSpend = expectedEnctrPrice
      .div(ethers.BigNumber.from(10).pow(eDecimals))
      .mul(amountToBuy);

    await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      true,
      amountToBuy.mul(3),
      amountToBuy,
      0
    );

    const addresses = [buyerAccounts[0], buyerAccounts[1], buyerAccounts[2]];
    for (let i = 0; i < addresses.length; i++) {
      await expect(
        sales
          .connect(addresses[i])
          .buy(await sales.currentSaleId(), amountToBuy)
      ).to.be.revertedWith("buyer not approved");
    }

    await sales.approveBuyers(
      await sales.currentSaleId(),
      addresses.map((account) => account.address)
    );

    for (let i = 0; i < addresses.length; i++) {
      await stablecoin.transfer(addresses[i].address, amountToSpend);
      await stablecoin
        .connect(addresses[i])
        .approve(sales.address, amountToSpend);
      await sales
        .connect(addresses[i])
        .buy(await sales.currentSaleId(), amountToBuy);
    }
  });

  it("can withdraw tokens", async function () {
    expect(await erc20.balanceOf(owner.address)).to.equal(
      "99999999999999999999990000000000"
    );
    await expect(
      sales.connect(buyerAccounts[0]).withdrawTokens(erc20.address)
    ).to.be.revertedWith("UNAUTHORIZED");
    sales.withdrawTokens(erc20.address);
    expect(await erc20.balanceOf(owner.address)).to.equal(
      "100000000000000000000000000000000"
    );
  });

  it("cannot create a free sale", async function () {
    await expect(
      sales.createSale(0, erc20.address, stablecoin.address, false, 1, 1, 0)
    ).to.be.revertedWith("no free lunch");

    await expect(
      sales.createSale(
        "999999999999999999",
        erc20.address,
        stablecoin.address,
        true,
        1,
        1,
        0
      )
    ).to.be.revertedWith("need ENCTR backing");
  });

  it("cannot start a sale twice", async function () {
    await sales.createSale(
      "1000000000000000000",
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );

    await expect(
      sales.createSale(
        "1000000000000000000",
        erc20.address,
        stablecoin.address,
        true,
        1,
        1,
        0
      )
    ).to.be.revertedWith("sale ongoing");
  });

  it("cannot stop an inactive sale", async function () {
    await expect(sales.stopSale(1)).to.be.revertedWith("sale is not active");
    await sales.createSale(
      "1000000000000000000",
      erc20.address,
      stablecoin.address,
      true,
      1,
      1,
      0
    );
    await sales.stopSale(1);
    await expect(sales.stopSale(1)).to.be.revertedWith("sale is not active");
  });

  it("can buy tokens from the contract", async function () {
    const expectedEnctrPrice = ethers.BigNumber.from(1)
      .mul(ethers.BigNumber.from(10).pow(sDecimals))
      .div(10);
    const amountToBuy = ethers.BigNumber.from(10).mul(
      ethers.BigNumber.from(10).pow(eDecimals)
    );
    const amountToSpend = expectedEnctrPrice
      .mul(amountToBuy)
      .div(ethers.BigNumber.from(10).pow(eDecimals));

    await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      false,
      amountToBuy,
      amountToBuy,
      0
    );
    await sales.approveBuyer(
      await sales.currentSaleId(),
      buyerAccounts[0].address
    );
    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);
    await sales
      .connect(buyerAccounts[0])
      .buy(await sales.currentSaleId(), amountToBuy);

    expect(await stablecoin.balanceOf(sales.address)).to.equal(amountToSpend);
    expect(
      amountToSpend.div(ethers.BigNumber.from(10).pow(sDecimals))
    ).to.equal(1);

    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToBuy
    );
    expect(amountToBuy.div(ethers.BigNumber.from(10).pow(eDecimals))).to.equal(
      10
    );
  });

  it("cannot buy more than max for sale", async function () {
    for (let i = 0; i < 3; i++) {
      const amount = ethers.BigNumber.from(200).mul(
        ethers.BigNumber.from(10).pow(sDecimals)
      );
      await stablecoin.transfer(buyerAccounts[i].address, amount);
      await stablecoin.connect(buyerAccounts[i]).approve(sales.address, amount);
    }

    for (const isTreasuryDeposit of [true, false]) {
      const expectedEnctrPrice = ethers.BigNumber.from(10).mul(
        ethers.BigNumber.from(10).pow(sDecimals)
      );

      await sales.createSale(
        expectedEnctrPrice,
        erc20.address,
        stablecoin.address,
        isTreasuryDeposit,
        2, // We will only sell two tokens max
        1, // No one gets more than one token
        0
      );
      const saleId = await sales.currentSaleId();

      await sales.approveBuyer(saleId, buyerAccounts[0].address);
      await expect(
        sales.connect(buyerAccounts[0]).buy(saleId, 2)
      ).to.be.revertedWith("buyer not approved");
      await sales.connect(buyerAccounts[0]).buy(saleId, 1);

      await sales.approveBuyer(saleId, buyerAccounts[1].address);
      await sales.connect(buyerAccounts[1]).buy(saleId, 1);

      await sales.approveBuyer(saleId, buyerAccounts[2].address);
      await expect(
        sales.connect(buyerAccounts[2]).buy(saleId, 1)
      ).to.be.revertedWith("sold out");

      await sales.stopSale(saleId);
    }
  });

  it("cannot buy less than min for sale", async function () {
    const expectedEnctrPrice = ethers.BigNumber.from(10).mul(
      ethers.BigNumber.from(10).pow(sDecimals)
    );

    await sales.createSale(
      expectedEnctrPrice,
      erc20.address,
      stablecoin.address,
      false,
      2,
      2,
      2
    );
    const saleId = await sales.currentSaleId();

    await sales.approveBuyer(saleId, buyerAccounts[0].address);
    await expect(
      sales.connect(buyerAccounts[0]).buy(saleId, 1)
    ).to.be.revertedWith("below minimum for sale");
  });
});
