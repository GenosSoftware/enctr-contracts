import { expect } from "chai";
import { ethers } from "hardhat";
import { smock } from "@defi-wonderland/smock";

describe("EncountrPrivateSales", function () {
  let erc20: any;
  let sales: any;

  let owner: any;
  let buyerAccounts: any[];

  beforeEach(async function () {
    [owner, ...buyerAccounts] = await ethers.getSigners();

    // ERC20
    const ERC20 = await smock.mock("MockERC20");
    erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 18);
    await erc20.deployed();
    await erc20.mint(owner.address, 1e10);

    // EncountrPrivateSales
    const s = await ethers.getContractFactory("EncountrPrivateSales");
    sales = await s.deploy(erc20.address);
    await sales.deployed();
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
});
