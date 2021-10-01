const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const EncountrToken = artifacts.require('Encountr');
const BattleScape = artifacts.require('BattleScape');

module.exports = async function (deployer, network) {
  let swapAddress;
  if (network == 'live' || network == 'develop') {
    swapAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
  } else {
    swapAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
  }

  let maxSupply = 1e11;
  const eInstance = await deployProxy(
    EncountrToken,
    [
      maxSupply,
      swapAddress,
    ],
    { deployer },
  );
  console.log('Encountr Proxy Deployed', eInstance.address);

  let e = await EncountrToken.deployed();
  const bsInstance = await deployProxy(BattleScape, [e.address], { deployer });
  console.log('BattleScape Proxy Deployed', bsInstance.address);
};
