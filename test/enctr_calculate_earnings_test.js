const truffleAssert = require('truffle-assertions');

const BattleScape = artifacts.require("BattleScape");
const EncountrToken = artifacts.require("Encountr");

contract("BattleScape", accounts => {


  /**
   * Questions: 
   * 1. Do we need to call increaseAllowance from here or inside the wager function?
   * 2. Can't we call increaseAllowance in calculateEarnings?
   */


  it("... should calculate proper earnings for a 1 player Enctr and collect earnings with 8% tax", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const playerAddress = accounts[0];
    const evt = accounts[1];
    const outcome = 1;
    const actualOutcome = 1;
    const wagerAmount = 100;

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
      winners.push(playerAddress);
    }
    wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, playerAddress);


    // Finish the enctr
    await battleScapeInstance.finishEnctr(actualOutcome, {from: evt});
    
    // Calculate the earnings for each winner (only 1 for this test)
    enctr = await battleScapeInstance.getEnctr(evt);
    await battleScapeInstance.calculateEarnings(evt, playerAddress);

    wag = await battleScapeInstance.getPlayerWagerForEnctr(evt, playerAddress);

    // Collect the earnings
    await ecountrInstance.increaseAllowance(battleScapeInstance.address, 5000000, {from: evt});
    await battleScapeInstance.collectEarnings(evt);

    // assert(web3.utils.toBN(wagerAmount).eq(wag[2]), "The wagered amt and the earnings should be the same");
    assert(wagerAmount == wag[2].toNumber(), "The wagered amt and the earnings should be the same");

  });


  it("... should properly calc earnings for a 2 player Enctr with 2 winners.", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const account1 = accounts[0];
    const player1Address = accounts[3];
    const player2Address = accounts[4];
    const evt = accounts[5];
    const actualOutcome = 1;
    const player1Wager = 10;
    const player2Wager = 5;
    const player1Outcome = 1;
    const player2Outcome = 1;

    // transfer some balance from account 1 to the others
    await ecountrInstance.transfer(player1Address,5000, {from: account1});
    await ecountrInstance.transfer(player2Address,5000, {from: account1});

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
      winners.push(player1Address);
    }
    if(web3.utils.toBN(player2Outcome).eq(wag2[0])) {
      winners.push(player2Address);
    }
    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);

    // Finish the enctr
    await battleScapeInstance.finishEnctr(actualOutcome, {from: evt});
    
    // Calculate the earnings for each winner (2 for this test)
    enctr = await battleScapeInstance.getEnctr(evt);
    await battleScapeInstance.calculateEarnings(evt, player1Address);
    await battleScapeInstance.calculateEarnings(evt, player2Address);

    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);
 
    assert(player1Wager-1 == wag1[2].toNumber(), "The earnings for player 1 should be half of the inital wager");
    assert(player2Wager-1 == wag2[2].toNumber(), "The earnings for player 2 should be half the initial wager");
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
    const player2Wager = 232; // 12,594 total for correct outcome and then 19988 for total overall
    const player3Wager = 7394;
    const player1Outcome = 1;
    const player2Outcome = 1;
    const player3Outcome = 2;

    // transfer some balance from account 1 to the others
    await ecountrInstance.transfer(player1Address, 500000, {from: account1});
    await ecountrInstance.transfer(player2Address, 500000, {from: account1});
    await ecountrInstance.transfer(player3Address, 500000, {from: account1});

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player1Wager, {from: player1Address});
    await battleScapeInstance.wager(evt, player1Outcome, player1Wager, {from: player1Address}); // Wagered 11374

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player2Wager, {from: player2Address});
    await battleScapeInstance.wager(evt, player2Outcome, player2Wager, {from: player2Address}); // Wagered 214

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, player3Wager, {from: player3Address});
    await battleScapeInstance.wager(evt, player3Outcome, player3Wager, {from: player3Address}); 


    const balance = await ecountrInstance.balanceOf(evt);

    // Calculate the wagered amount against the addresses with the correct outcome
    let enctr = await battleScapeInstance.getEnctr(evt);

    // Loop through all of the Enctrs wagers with the correct outcome
    let winners = [];
    
    var wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    var wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);
    var wag3 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);
    if(web3.utils.toBN(player1Outcome).eq(wag1[0])) {
      winners.push(player1Address);
    }
    if(web3.utils.toBN(player2Outcome).eq(wag2[0])) {
      winners.push(player2Address);
    }
    if(web3.utils.toBN(player3Outcome).eq(wag3[0])) {
      winners.push(player3Address);
    }

    // Finish the enctr
    await battleScapeInstance.finishEnctr(actualOutcome, {from: evt});
    
    // Calculate the earnings for each winner (3 for this test)
    enctr = await battleScapeInstance.getEnctr(evt);
    await battleScapeInstance.calculateEarnings(evt, player1Address);
    await battleScapeInstance.calculateEarnings(evt, player2Address);
    await battleScapeInstance.calculateEarnings(evt, player3Address);

    wag1 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player1Address);
    wag2 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player2Address);
    wag3 = await battleScapeInstance.getPlayerWagerForEnctr(evt, player3Address);

    /**
     * Being mindful of the 8% tax on every transfer
     */
    assert(18042 == wag1[2].toNumber(), "The earnings for player 1 should be 18042");
    assert(331 == wag2[2].toNumber(), "The earnings for player 2 should be 331");
    assert(0 == wag3[2].toNumber(), "The earnings for player 3 should be 0");
  });


});
