const truffleAssert = require('truffle-assertions');

const BattleScape = artifacts.require("BattleScape");
const EncountrToken = artifacts.require("Encountr");

contract("BattleScape", accounts => {

  it("... should add a wager to the ledger.", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const evt = accounts[1];
    const outcome = 1;
    const wagerAmount = 10;

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, wagerAmount);
    await battleScapeInstance.wager(evt, outcome, wagerAmount);

    const w = await battleScapeInstance.getWager(evt);

    assert(web3.utils.toBN(outcome).eq(w[0]), "The outcomes must be equal");
    assert(web3.utils.toBN(wagerAmount).eq(w[1]), "The amounts must be equal");
  });

  it("... should fail to cancel a null wager.", async () => {
    const battleScapeInstance = await BattleScape.deployed();

    await truffleAssert.fails(
      battleScapeInstance.cancelWager(accounts[2]),
      truffleAssert.ErrorType.REVERT,
      "no bet to cancel",
    );
  });

  it("... should cancel an approved wager.", async () => {
    const battleScapeInstance = await BattleScape.deployed();
    const ecountrInstance = await EncountrToken.deployed();

    const evt = accounts[3];
    const outcome = 1;
    const wagerAmount = 10;

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, wagerAmount);
    await battleScapeInstance.wager(evt, outcome, wagerAmount);

    await ecountrInstance.increaseAllowance(battleScapeInstance.address, wagerAmount, {from: evt});
    await battleScapeInstance.cancelWager(evt);

    const w = await battleScapeInstance.getWager(evt);
    assert(web3.utils.toBN('0').eq(w[0]), "The outcome must be 0");
    assert(web3.utils.toBN('0').eq(w[1]), "The wager amount must be 0");
  });

});
