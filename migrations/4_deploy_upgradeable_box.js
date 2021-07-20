const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const EncountrToken = artifacts.require('Encountr');
const BattleScape = artifacts.require('BattleScape');

module.exports = async function (deployer) {
  const e = await EncountrToken.deployed()
  const instance = await deployProxy(BattleScape, [e.address], { deployer });
  console.log('Deployed', instance.address);
};
