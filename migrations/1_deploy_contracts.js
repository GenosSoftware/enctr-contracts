const Migrations = artifacts.require('Migrations');
const EncountrToken = artifacts.require('Encountr');
const BattleScape = artifacts.require('BattleScape');

module.exports = async function(deployer) {
  await deployer.deploy(Migrations);
  await deployer.deploy(EncountrToken);
  await deployer.deploy(BattleScape);
};
