const EncountrToken = artifacts.require("Encountr");
const EncountrTestNetToken = artifacts.require("EncountrTestNet");

module.exports = function(deployer, network) {
  if (network == "live" || network == "develop") {
    deployer.deploy(EncountrToken);
  } else {
    deployer.deploy(EncountrTestNetToken);
  }
};
