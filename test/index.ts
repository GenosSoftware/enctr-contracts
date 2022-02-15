import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("BattleScape", function () {
  let erc20: any;
  let battlescape: any;

  let owner: any;
  let evt: any;
  let transactions: any;
  let playerAccounts: any[];

  beforeEach(async function () {
    [owner, evt, transactions, ...playerAccounts] = await ethers.getSigners();

    // ERC20
    const ERC20 = await ethers.getContractFactory("MockERC20");
    erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 1e10);
    await erc20.deployed();

    // BattleScape
    const BattleScape = await ethers.getContractFactory("BattleScape");
    battlescape = await upgrades.deployProxy(BattleScape, [
      erc20.address,
      transactions.address,
    ]);
    await battlescape.deployed();
  });

  it("Should add a wager to the ledger.", async function () {
    const outcome = 1;
    const wagerAmount = 10;

    await erc20.increaseAllowance(battlescape.address, wagerAmount);
    await battlescape.wager(evt.address, outcome, wagerAmount);

    const w = await battlescape.getWager(evt.address);
    expect(ethers.BigNumber.from(outcome)).to.equal(w[0]);
    expect(ethers.BigNumber.from(wagerAmount)).to.equal(w[1]);

    const o = await battlescape.getEnctrTotalWagerForOutcome(
      evt.address,
      outcome
    );
    expect(ethers.BigNumber.from(wagerAmount)).to.equal(o);
  });

  it("Should fail to cancel a null wager.", async function () {
    await expect(battlescape.cancelWager(evt.address)).to.be.revertedWith(
      "no bet to cancel"
    );
  });

  it("Should cancel an approved wager.", async () => {
    const outcome = 1;
    const wagerAmount = 10;

    await erc20.increaseAllowance(battlescape.address, wagerAmount);
    await battlescape.wager(evt.address, outcome, wagerAmount);

    await erc20
      .connect(evt)
      .increaseAllowance(battlescape.address, wagerAmount);
    await battlescape.cancelWager(evt.address);

    const w = await battlescape.getWager(evt.address);
    expect(ethers.BigNumber.from("0")).to.equal(w[0]);
    expect(ethers.BigNumber.from("0")).to.equal(w[1]);

    const o = await battlescape.getEnctrTotalWagerForOutcome(
      evt.address,
      outcome
    );
    expect(ethers.BigNumber.from("0")).to.equal(o);
  });

  it("Should not allow collection on 0 outcome before finish.", async () => {
    const outcome = 0;
    const wagerAmount = 100;

    await erc20.connect(owner).transfer(playerAccounts[0].address, wagerAmount);
    await erc20
      .connect(playerAccounts[0])
      .increaseAllowance(battlescape.address, 1e11);
    await erc20.connect(evt).increaseAllowance(battlescape.address, 1e11);
    await battlescape
      .connect(playerAccounts[0])
      .wager(evt.address, outcome, wagerAmount);

    // NOTE: The Encountr is not finished
    await expect(
      battlescape.connect(playerAccounts[0]).collectEarnings(evt.address)
    ).to.be.revertedWith("no earnings from this enctr");

    const wag = await battlescape.getPlayerWagerForEnctr(
      evt.address,
      playerAccounts[0].address
    );
    expect(wag[0]).to.equal(outcome);
    expect(wag[1]).to.equal(wagerAmount);
    expect(wag[2]).to.equal(0);
    const playerBalance = await erc20.balanceOf(playerAccounts[0].address);
    expect(playerBalance).to.equal(0);
    const feeBalance = await erc20.balanceOf(transactions.address);
    expect(feeBalance).to.equal(0);
    const evtBalance = await erc20.balanceOf(evt.address);
    expect(evtBalance).to.equal(wagerAmount);
  });

  it("Should calculate proper earnings for a 1 player Enctr and collect earnings with 2% tax", async () => {
    const outcome = 1;
    const actualOutcome = 1;
    const wagerAmount = 100;

    // Setting up the wager (mocking the dApp)
    await erc20.connect(owner).transfer(playerAccounts[0].address, wagerAmount);
    await erc20
      .connect(playerAccounts[0])
      .increaseAllowance(battlescape.address, 1e11);
    await erc20.connect(evt).increaseAllowance(battlescape.address, 1e11);
    await erc20
      .connect(transactions)
      .increaseAllowance(battlescape.address, 1e11);
    await battlescape
      .connect(playerAccounts[0])
      .wager(evt.address, outcome, wagerAmount);

    // Finish the Encountr (mocking the finisher cron)
    await battlescape.connect(evt).finishEnctr(actualOutcome);

    // Collect (cha-ching!)
    await battlescape.connect(playerAccounts[0]).collectEarnings(evt.address);

    const wag = await battlescape.getPlayerWagerForEnctr(
      evt.address,
      playerAccounts[0].address
    );
    const expectedEarnings = 98; // When finishEnctr is called, 2% is taken as a transaction fee.
    expect(wag[2]).to.equal(expectedEarnings);
    const playerBalance = await erc20.balanceOf(playerAccounts[0].address);
    expect(playerBalance).to.equal(expectedEarnings);
    const feeBalance = await erc20.balanceOf(transactions.address);
    expect(feeBalance).to.equal(wagerAmount - expectedEarnings);
  });
});
