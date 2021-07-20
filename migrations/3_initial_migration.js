var Migrations = artifacts.require("./Migrations.sol");
var BattleScape = artifacts.require("./BattleScape.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(BattleScape);
};
