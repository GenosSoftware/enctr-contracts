const truffleAssert = require('truffle-assertions');

const BattleScape = artifacts.require("BattleScape");
const EncountrToken = artifacts.require("Encountr");

contract("BattleScape", accounts => {

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

});
