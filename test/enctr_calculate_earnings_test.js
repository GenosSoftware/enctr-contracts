const truffleAssert = require('truffle-assertions');

const BattleScape = artifacts.require("BattleScape");
const EncountrToken = artifacts.require("Encountr");

contract("BattleScape", accounts => {


  /**
   * Questions: 
   * 1. Do we need to call increaseAllowance from here or inside the wager function?
   * 2. Can't we call increaseAllowance in calculateEarnings?
   */


  it("... should calculate proper earnings for a 1 player Enctr", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    console.log("Player Address " + accounts[0]);
    console.log("Enctr Address " + accounts[1]);

    const playerAddress = accounts[0];
    const evt = accounts[1];
    const outcome = 1;
    const actualOutcome = 1;
    const wagerAmount = 10;

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, wagerAmount);
    await battleScapeInstance.wager(evt, outcome, wagerAmount, {from: playerAddress});

    // Calculate the wagered amount against the addresses with the correct outcome
    let enctr = await battleScapeInstance.getEnctr(evt);

    // Loop through all of the Enctrs wagers with the correct outcome
    var wagActAmt = web3.utils.toBN(0);
    let winners = [];
    
    var wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, playerAddress);
    if(web3.utils.toBN(outcome).eq(wag[0])) {
      // Add it to the wagActAmt
      wagActAmt = wagActAmt.add(wag[1]);
      console.log("New Wagered Amount: " + wagActAmt);
      winners.push(playerAddress);
    }
    wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, playerAddress);


    // Finish the enctr
    console.log("Total Amount Wagered for Actual Outcome: " + wagActAmt);
    await battleScapeInstance.finishEnctr(actualOutcome, wagActAmt, {from: evt});
    
    // Calculate the earnings for each winner (only 1 for this test)
    enctr = await battleScapeInstance.getEnctr(evt);
    await battleScapeInstance.calculateEarnings(evt, playerAddress);

    /**
     * 
     * Questions to ask
     * 1. Can we call increaseAllowance inside of the calculateEarnings function?
     * 
     */

    wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, playerAddress);

    console.log("WagerAmount: " + wagerAmount);
    console.log("Earnings: " + wag[2].toNumber());

    // assert(web3.utils.toBN(wagerAmount).eq(wag[2]), "The wagered amt and the earnings should be the same");
    assert(wagerAmount == wag[2].toNumber(), "The wagered amt and the earnings should be the same");
  });


  it("... should properly calc earnings for a 2 player Enctr with 2 winners.", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    console.log("Player 1 Address " + accounts[0]);
    console.log("Player 2 Address " + accounts[2]);
    console.log("Enctr Address " + accounts[1]);

    const player1Address = accounts[0];
    const player2Address = accounts[2];
    const evt = accounts[1];
    const actualOutcome = 1;
    const player1Wager = 10;
    const player2Wager = 5;
    const player1Outcome = 1;
    const player2Outcome = 1;

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player1Wager, {from: player1Address});
    await battleScapeInstance.wager(evt, player1Outcome, player1Wager, {from: player1Address});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player2Wager, {from: player2Address});
    await battleScapeInstance.wager(evt, player2Outcome, player2Wager, {from: player2Address});

    // Calculate the wagered amount against the addresses with the correct outcome
    let enctr = await battleScapeInstance.getEnctr(evt);

    // Loop through all of the Enctrs wagers with the correct outcome
    var wagActAmt = web3.utils.toBN(0);
    let winners = [];
    
    var wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    var wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);
    if(web3.utils.toBN(player1Outcome).eq(wag1[0])) {
      // Add it to the wagActAmt
      wagActAmt = wagActAmt.add(wag1[1]);
      console.log("New Wagered Amount: " + wagActAmt);
      winners.push(player1Address);
    }
    if(web3.utils.toBN(player2Outcome).eq(wag2[0])) {
      // Add it to the wagActAmt
      wagActAmt = wagActAmt.add(wag2[1]);
      console.log("New Wagered Amount: " + wagActAmt);
      winners.push(player2Address);
    }
    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);


    // Finish the enctr
    console.log("Total Amount Wagered for Actual Outcome: " + wagActAmt);
    await battleScapeInstance.finishEnctr(actualOutcome, wagActAmt, {from: evt});
    
    // Calculate the earnings for each winner (2 for this test)
    enctr = await battleScapeInstance.getEnctr(evt);
    await battleScapeInstance.calculateEarnings(evt, player1Address);
    await battleScapeInstance.calculateEarnings(evt, player2Address);

    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);

    assert(player1Wager == wag1[2].toNumber(), "The wagered amt and the earnings should be the same");
    assert(player2Wager == wag2[2].toNumber(), "The wagered amt and the earnings should be the same");
  });


});
