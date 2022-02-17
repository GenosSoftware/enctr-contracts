import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { smock } from "@defi-wonderland/smock";

interface Players {
  wager: number;
  outcome: number;
  earnings: number;
}

interface Test {
  summary: string;
  outcome: number;
  totalWagers: number;
  totalWagersNetFee: number;
  players: Players[];
}

function calculateEarnings(test: Test, fee: number) {
  let total = 0;
  let winnersTotal = 0;
  const winners = [];
  for (let i = 0; i < test.players.length; i++) {
    if (test.players[i].outcome === test.outcome) {
      winners.push(i);
      winnersTotal += test.players[i].wager;
    }
    total += test.players[i].wager;
  }

  test.totalWagers = total;
  const f = Math.floor(total * fee);
  test.totalWagersNetFee = total - f;

  for (const i of winners) {
    test.players[i].earnings = Math.floor(
      test.totalWagersNetFee * (test.players[i].wager / winnersTotal)
    );
  }
}

describe("BattleScape", function () {
  const tests: Test[] = [
    {
      summary: "two players, both winners, different wagers",
      outcome: 1,
      totalWagers: 0,
      totalWagersNetFee: 0,
      players: [
        {
          wager: 100,
          outcome: 1,
          earnings: 0,
        },
        {
          wager: 100,
          outcome: 1,
          earnings: 0,
        },
      ],
    },
    {
      summary: "three players, two winners, different wagers",
      outcome: 1,
      totalWagers: 0,
      totalWagersNetFee: 0,
      players: [
        {
          wager: 12362,
          outcome: 1,
          earnings: 0,
        },
        {
          wager: 232,
          outcome: 1,
          earnings: 0,
        },
        {
          wager: 7394,
          outcome: 2,
          earnings: 0,
        },
      ],
    },
  ];

  for (const test of tests) {
    calculateEarnings(test, 0.02);
  }

  tests.forEach(({ summary, outcome, totalWagersNetFee, players }) => {
    it(summary, async function () {
      /*
      const [owner, evt, transactions, ...playerAccounts] =
        await ethers.getSigners();

      // ERC20
      const ERC20 = await smock.mock("MockERC20");
      const erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 18);
      await erc20.deployed();

      // BattleScape
      const BattleScape = await ethers.getContractFactory("BattleScape");
      const battlescape = await upgrades.deployProxy(BattleScape, [
        erc20.address,
        transactions.address,
      ]);
      await battlescape.deployed();
      */

      await erc20.connect(evt).approve(battlescape.address, 1e11);
      await erc20.connect(transactions).approve(battlescape.address, 1e11);

      for (let i = 0; i < players.length; i++) {
        const { wager, outcome } = players[i];

        // First, transfer enough ERC-20 to each player based on their wager.
        await erc20.connect(owner).transfer(playerAccounts[i].address, wager);
        // Then, authorize the battlescape contract to transfer funds.
        await erc20
          .connect(playerAccounts[i])
          .approve(battlescape.address, 1e11);
        // Finally, make each wager.
        await battlescape
          .connect(playerAccounts[i])
          .wager(evt.address, outcome, wager);

        const w = await battlescape.getPlayerWagerForEnctr(
          evt.address,
          playerAccounts[i].address
        );
        expect(w[0]).to.equal(outcome);
        expect(w[1]).to.equal(wager);
        expect(w[2]).to.equal(0);
      }

      const balanceBeforeFee = await erc20.balanceOf(evt.address);
      await battlescape.connect(evt).finishEnctr(outcome);
      const balanceAfterFee = await erc20.balanceOf(evt.address);
      const transactionBalance = await erc20.balanceOf(transactions.address);
      expect(transactionBalance).to.equal(
        balanceBeforeFee.sub(totalWagersNetFee)
      );
      expect(balanceBeforeFee).to.equal(
        balanceAfterFee.add(transactionBalance)
      );

      for (let i = 0; i < players.length; i++) {
        const { wager, outcome, earnings } = players[i];

        if (earnings === 0) {
          await expect(
            battlescape.connect(playerAccounts[i]).collectEarnings(evt.address)
          ).to.be.revertedWith("no earnings from this enctr");
          continue;
        }

        await battlescape
          .connect(playerAccounts[i])
          .collectEarnings(evt.address);
        const w = await battlescape.getPlayerWagerForEnctr(
          evt.address,
          playerAccounts[i].address
        );
        expect(w[0]).to.equal(outcome);
        expect(w[1]).to.equal(wager);
        expect(w[2], `earnings are incorrect for player ${i}`).to.equal(
          earnings
        );

        const playerBalance = await erc20.balanceOf(playerAccounts[i].address);
        expect(playerBalance).to.equal(earnings);
      }
    });
  });

  let erc20: any;
  let battlescape: any;

  let owner: any;
  let evt: any;
  let transactions: any;
  let playerAccounts: any[];

  beforeEach(async function () {
    [owner, evt, transactions, ...playerAccounts] = await ethers.getSigners();

    // ERC20
    const ERC20 = await smock.mock("MockERC20");
    erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 18);
    await erc20.deployed();
    await erc20.mint(owner.address, 1e10);

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

    await erc20.approve(battlescape.address, wagerAmount);
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

    await erc20.approve(battlescape.address, wagerAmount);
    await battlescape.wager(evt.address, outcome, wagerAmount);

    await erc20.connect(evt).approve(battlescape.address, wagerAmount);
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
    await erc20.connect(playerAccounts[0]).approve(battlescape.address, 1e11);
    await erc20.connect(evt).approve(battlescape.address, 1e11);
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

  it("Should not allow wagers to be cancelled after start.", async () => {
    const outcome = 0;
    const wagerAmount = 100;

    await erc20.connect(owner).transfer(playerAccounts[0].address, wagerAmount);
    await erc20.connect(playerAccounts[0]).approve(battlescape.address, 1e11);
    await erc20.connect(evt).approve(battlescape.address, 1e11);
    await battlescape
      .connect(playerAccounts[0])
      .wager(evt.address, outcome, wagerAmount);

    await battlescape.connect(evt).startEnctr();
    await expect(
      battlescape.connect(playerAccounts[0]).cancelWager(evt.address)
    ).to.be.revertedWith("match has already started");
  });

  it("Should not allow wagers to be made after start.", async () => {
    await battlescape.connect(evt).startEnctr();
    await expect(
      battlescape.connect(playerAccounts[0]).wager(evt.address, 1, 1)
    ).to.be.revertedWith("match has already started");
  });

  it("Should calculate proper earnings for a 1 player Enctr and collect earnings with 2% tax", async () => {
    const outcome = 1;
    const actualOutcome = 1;
    const wagerAmount = 100;

    // Setting up the wager (mocking the dApp)
    await erc20.connect(owner).transfer(playerAccounts[0].address, wagerAmount);
    await erc20.connect(playerAccounts[0]).approve(battlescape.address, 1e11);
    await erc20.connect(evt).approve(battlescape.address, 1e11);
    await erc20.connect(transactions).approve(battlescape.address, 1e11);
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
