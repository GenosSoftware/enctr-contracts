import { expect } from "chai";
import { ethers } from "hardhat";
import { smock } from "@defi-wonderland/smock";

describe("EncountrPrivateSales", function () {
  let erc20: any;
  let stablecoin: any;
  let sales: any;

  let owner: any;
  let buyerAccounts: any[];

  beforeEach(async function () {
    [owner, ...buyerAccounts] = await ethers.getSigners();

    // Mock stablecoin
    const sc = await smock.mock("MockERC20");
    stablecoin = await sc.deploy("MockDAI", "tDAI", 18);
    await stablecoin.deployed();
    await stablecoin.mint(owner.address, 1e10);

    // ERC20
    const ERC20 = await smock.mock("MockERC20");
    erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 18);
    await erc20.deployed();
    await erc20.mint(owner.address, 1e10);

    // Authority
    const a = await ethers.getContractFactory("EncountrAuthority");
    const authority = await a.deploy(
      owner.address,
      owner.address,
      owner.address,
      owner.address
    );

    // EncountrPrivateSales
    const s = await ethers.getContractFactory("EncountrPrivateSales");
    sales = await s.deploy(erc20.address, authority.address);
    await sales.deployed();

    erc20.transfer(sales.address, 1e10);
  });

  it("zero (0) sale is not allowed", async function () {
    expect(await sales.currentSaleId()).to.equal(0);

    await expect(
      sales.connect(buyerAccounts[0]).buy(await sales.currentSaleId(), 1e10)
    ).to.be.revertedWith("sale is not active!");
    await expect(
      sales.approveBuyer(await sales.currentSaleId(), buyerAccounts[0].address)
    ).to.be.revertedWith("sale is not active!");
  });

  it("saleId must equal currentSaleId", async function () {
    const expectedEnctrPerUnit = 100;

    let tx = await sales.createSale(
      expectedEnctrPerUnit,
      stablecoin.address,
      owner.address
    );
    let rc = await tx.wait();
    const [currentSaleId, enctrPerUnit, purchaseToken] = rc.events[0].args;
    expect(currentSaleId).to.equal(1);
    expect(currentSaleId).to.equal(await sales.currentSaleId());
    expect(enctrPerUnit).to.equal(expectedEnctrPerUnit);
    expect(purchaseToken).to.equal(stablecoin.address);

    await sales.stopSale(currentSaleId);

    tx = await sales.createSale(
      expectedEnctrPerUnit,
      stablecoin.address,
      owner.address
    );
    rc = await tx.wait();
    expect(rc.events[0].args[0]).to.equal(await sales.currentSaleId());
    expect(rc.events[0].args[0]).to.equal(2);
  });

  it("only owners can start and stop sales", async function () {
    await expect(
      sales
        .connect(buyerAccounts[0])
        .createSale(100, stablecoin.address, buyerAccounts[0].address)
    ).to.be.revertedWith("UNAUTHORIZED");

    await sales.createSale(100, stablecoin.address, owner.address);
    await expect(
      sales.connect(buyerAccounts[0]).stopCurrentSale()
    ).to.be.revertedWith("UNAUTHORIZED");
  });

  it("only approved buyers are allowed", async function () {
    const expectedEnctrPerUnit = 100;
    const amountToSpend = 10;

    await stablecoin.transfer(buyerAccounts[0].address, amountToSpend);
    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToSpend
    );

    await sales.createSale(
      expectedEnctrPerUnit,
      stablecoin.address,
      owner.address
    );
    await expect(
      sales
        .connect(buyerAccounts[0])
        .buy(await sales.currentSaleId(), amountToSpend)
    ).to.be.revertedWith("buyer not approved!");

    await sales.approveBuyer(
      await sales.currentSaleId(),
      buyerAccounts[0].address
    );

    await stablecoin
      .connect(buyerAccounts[0])
      .approve(sales.address, amountToSpend);
    await sales
      .connect(buyerAccounts[0])
      .buy(await sales.currentSaleId(), amountToSpend);

    expect(await stablecoin.balanceOf(buyerAccounts[0].address)).to.equal(0);
    expect(await erc20.balanceOf(buyerAccounts[0].address)).to.equal(
      amountToSpend * expectedEnctrPerUnit
    );
  });

  it("stopped sale is unusable", async function () {
    await sales.createSale(100, stablecoin.address, owner.address);
    await sales.approveBuyer(
      await sales.currentSaleId(),
      buyerAccounts[0].address
    );
    await sales.stopSale(await sales.currentSaleId());

    await expect(
      sales.connect(buyerAccounts[0]).buy(await sales.currentSaleId(), 1e10)
    ).to.be.revertedWith("sale is not active!");
  });

  it("created sale is properly formatted", async function () {
    const expectedEnctrPerUnit = 100;
    await sales.createSale(
      expectedEnctrPerUnit,
      stablecoin.address,
      owner.address
    );

    const saleId = await sales.currentSaleId();
    let sale = await sales.sales(saleId);
    expect(sale.active).to.be.true; // eslint-disable-line no-unused-expressions
    expect(sale.id).to.equal(saleId);
    expect(sale.enctrPerUnit).to.equal(expectedEnctrPerUnit);
    expect(sale.purchaseToken).to.equal(stablecoin.address);
    expect(sale.proceedsAddress).to.equal(owner.address);

    await sales.stopCurrentSale();

    sale = await sales.sales(saleId);
    expect(sale.active).to.be.false; // eslint-disable-line no-unused-expressions
  });

  it("mass approve buyers", async function () {
    await sales.createSale(100, stablecoin.address, owner.address);

    const addresses = [buyerAccounts[0], buyerAccounts[1], buyerAccounts[2]];
    for (let i = 0; i < addresses.length; i++) {
      await expect(
        sales.connect(addresses[i]).buy(await sales.currentSaleId(), 10)
      ).to.be.revertedWith("buyer not approved!");
    }

    await sales.approveBuyers(
      await sales.currentSaleId(),
      addresses.map((account) => account.address)
    );

    for (let i = 0; i < addresses.length; i++) {
      const amountToSpend = 10;
      await stablecoin.transfer(addresses[i].address, amountToSpend);
      await stablecoin
        .connect(addresses[i])
        .approve(sales.address, amountToSpend);
      await sales
        .connect(addresses[i])
        .buy(await sales.currentSaleId(), amountToSpend);
    }
  });

  it("can withdraw tokens", async function () {
    expect(await erc20.balanceOf(owner.address)).to.equal(0);
    await expect(
      sales.connect(buyerAccounts[0]).withdrawTokens(erc20.address)
    ).to.be.revertedWith("UNAUTHORIZED");
    sales.withdrawTokens(erc20.address);
    expect(await erc20.balanceOf(owner.address)).to.equal(1e10);
  });

  it("cannot create a free sale", async function () {
    await expect(
      sales.createSale(0, stablecoin.address, owner.address)
    ).to.be.revertedWith("no free lunch!");
  });

  it("cannot start a sale twice", async function () {
    await sales.createSale(1, stablecoin.address, owner.address);

    await expect(
      sales.createSale(1, stablecoin.address, owner.address)
    ).to.be.revertedWith("sale ongoing!");
  });

  it("cannot stop an inactive sale", async function () {
    await expect(sales.stopSale(1)).to.be.revertedWith("sale is not active!");
    await sales.createSale(1, stablecoin.address, owner.address);
    await sales.stopSale(1);
    await expect(sales.stopSale(1)).to.be.revertedWith("sale is not active!");
  });

  it("cannot double approve a buyer", async function () {
    await sales.createSale(100, stablecoin.address, owner.address);
    await sales.approveBuyer(
      await sales.currentSaleId(),
      buyerAccounts[0].address
    );
    await expect(
      sales.approveBuyer(await sales.currentSaleId(), buyerAccounts[0].address)
    ).to.be.revertedWith("buyer is already approved!");
  });
});
