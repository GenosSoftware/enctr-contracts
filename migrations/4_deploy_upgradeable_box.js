const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const EncountrToken = artifacts.require('Encountr');
const EncountrTestNetToken = artifacts.require("EncountrTestNet");
const BattleScape = artifacts.require('BattleScape');

module.exports = async function (deployer, network) {
  let e;
  if (network == "live" || network == "develop") {
    e = await EncountrToken.deployed();
  } else {
    e = await EncountrTestNetToken.deployed();
  }

  const instance = await deployProxy(BattleScape, [e.address], { deployer });
  console.log('Deployed', instance.address);
};
