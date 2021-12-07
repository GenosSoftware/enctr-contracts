const truffleAssert = require('truffle-assertions');

const BattleScape = artifacts.require("BattleScape");
const EncountrToken = artifacts.require("Encountr");

contract("BattleScape", accounts => {

  it("... should calculate proper earnings for a 1 player Enctr and collect earnings with 2% tax", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const account1 = accounts[0];
    const playerAddress = accounts[9];
    const evt = accounts[1];
    const outcome = 1;
    const actualOutcome = 1;
    const wagerAmount = 100;

    await ecountrInstance.excludeFromTax(evt);
    await ecountrInstance.transfer(playerAddress, 50000, {from: account1});
    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 100000000000, {from: evt});
    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 100000000000, {from: playerAddress});
    await battleScapeInstance.wager(evt, outcome, wagerAmount, {from: playerAddress}); // 2% (2) should be taken from here so 98 is placed in escrow

    // Finish the enctr
    await battleScapeInstance.finishEnctr(actualOutcome, {from: evt});

    // Calculate the earnings for each winner (only 1 for this test)
    let enctr = await battleScapeInstance.getEnctr(evt);

    // Collect the earnings
    await battleScapeInstance.collectEarnings(evt, {from: playerAddress});

    let wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, playerAddress);
    let expectedEarnings = 98;

    console.log("The wager outcome amount: " + wag[2].toNumber());
    assert(expectedEarnings == wag[2].toNumber(), `the earnings should be ${expectedEarnings}`);
  });


  it("... should properly calc earnings for a 2 player Enctr with 2 winners.", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const account1 = accounts[0];
    const player1Address = accounts[3];
    const player2Address = accounts[4];
    const evt = accounts[5];
    const actualOutcome = 1;
    const player1Wager = 100;
    const player2Wager = 50;
    const player1Outcome = 1;
    const player2Outcome = 1;

    await ecountrInstance.setTaxPercentage(2);
    await ecountrInstance.excludeFromTax(evt);
    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 100000000000, {from: evt});

    // transfer some balance from account 1 to the others
    await ecountrInstance.transfer(player1Address, 5000, {from: account1});
    await ecountrInstance.transfer(player2Address, 5000, {from: account1});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player1Wager, {from: player1Address});
    await battleScapeInstance.wager(evt, player1Outcome, player1Wager, {from: player1Address});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player2Wager, {from: player2Address});
    await battleScapeInstance.wager(evt, player2Outcome, player2Wager, {from: player2Address});

    // Calculate the wagered amount against the addresses with the correct outcome
    var enctr = await battleScapeInstance.getEnctr(evt);

    // Loop through all of the Enctrs wagers with the correct outcome
    var winners = [];

    for (const player of enctr[0]) {
      let wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, player);
      if(web3.utils.toBN(actualOutcome).eq(wag[0])) {
        winners.push(player);
      }
    }

    // Finish the enctr
    await ecountrInstance.excludeFromTax(evt);
    await battleScapeInstance.finishEnctr(actualOutcome, {from: evt});

    // Collect the earnings for each winner (2 for this test)
    await battleScapeInstance.collectEarnings(evt, {from: player1Address});
    await battleScapeInstance.collectEarnings(evt, {from: player2Address});

    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);

    assert(97 == wag1[2].toNumber(), "The earnings for player 1 should be half of the inital wager");
    assert(48 == wag2[2].toNumber(), "The earnings for player 2 should be half the initial wager");
  });

  it("... should properly calc earnings for a 3 player Enctr with 2 winners.", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const account1 = accounts[0];
    const player1Address = accounts[3];
    const player2Address = accounts[4];
    const player3Address = accounts[6];
    const evt = accounts[7];
    const actualOutcome = 1;
    const player1Wager = 12362;
    const player2Wager = 232; // 12,594 total for correct outcome and then 19988 for total overall (19589 after tax)
    const player3Wager = 7394;
    const player1Outcome = 1;
    const player2Outcome = 1;
    const player3Outcome = 2;

    await ecountrInstance.setTaxPercentage(2);
    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 100000000000, {from: evt});
    await ecountrInstance.excludeFromTax(evt);

    // transfer some balance from account 1 to the others
    await ecountrInstance.transfer(player1Address, 500000, {from: account1});
    await ecountrInstance.transfer(player2Address, 500000, {from: account1});
    await ecountrInstance.transfer(player3Address, 500000, {from: account1});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 10000000000000, {from: player1Address});
    await battleScapeInstance.wager(evt, player1Outcome, player1Wager, {from: player1Address});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 10000000000000, {from: player2Address});
    await battleScapeInstance.wager(evt, player2Outcome, player2Wager, {from: player2Address});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 10000000000000, {from: player3Address});
    await battleScapeInstance.wager(evt, player3Outcome, player3Wager, {from: player3Address});

    // Calculate the wagered amount against the addresses with the correct outcome
    var enctr = await battleScapeInstance.getEnctr(evt);

    // Loop through all of the Enctrs wagers with the correct outcome
    var winners = [];

    for (const player of enctr[0]) {
      let wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, player);
      if(web3.utils.toBN(actualOutcome).eq(wag[0])) {
        winners.push(player);
      }
    }

    // Finish the enctr
    await battleScapeInstance.finishEnctr(actualOutcome, {from: evt}); // 19589 after tax.

    // Collect the earnings for each winner (2 for this test)
    await battleScapeInstance.collectEarnings(evt, {from: player1Address});
    await battleScapeInstance.collectEarnings(evt, {from: player2Address});

    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);
    wag3 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player3Address);

    assert(19216 == wag1[2].toNumber(), "The earnings for player 1 should be 19216");
    assert(352 == wag2[2].toNumber(), "The earnings for player 2 should be 352");
    assert(0 == wag3[2].toNumber(), "The earnings for player 3 should be 0");
  });


});
