const truffleAssert = require('truffle-assertions');

const EncountrToken = artifacts.require("Encountr");

contract("Encountr", accounts => {

  it("... should exclude taxes from owner", async () => {
    const encountrInstance = await EncountrToken.deployed();

    const encountrOwner = accounts[0];
    const recipient = accounts[1];
    const sendAmount = 50000;
    await encountrInstance.transfer(recipient, 50000, {from: encountrOwner});

    const balance = await encountrInstance.balanceOf(recipient);
    assert(sendAmount == balance, `the balance should be ${sendAmount} but was ${balance}`);
  });

});
