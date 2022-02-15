import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

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

describe("BattleScape Earnings", function () {
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
      const [owner, evt, transactions, ...playerAccounts] =
        await ethers.getSigners();

      // ERC20
      const ERC20 = await ethers.getContractFactory("MockERC20");
      const erc20 = await ERC20.deploy("MockEncountr", "tENCTR", 1e10);
      await erc20.deployed();

      // BattleScape
      const BattleScape = await ethers.getContractFactory("BattleScape");
      const battlescape = await upgrades.deployProxy(BattleScape, [
        erc20.address,
        transactions.address,
      ]);
      await battlescape.deployed();

      await erc20.connect(evt).increaseAllowance(battlescape.address, 1e11);
      await erc20
        .connect(transactions)
        .increaseAllowance(battlescape.address, 1e11);

      for (let i = 0; i < players.length; i++) {
        const { wager, outcome } = players[i];

        // First, transfer enough ERC-20 to each player based on their wager.
        await erc20.connect(owner).transfer(playerAccounts[i].address, wager);
        // Then, authorize the battlescape contract to transfer funds.
        await erc20
          .connect(playerAccounts[i])
          .increaseAllowance(battlescape.address, 1e11);
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
});
