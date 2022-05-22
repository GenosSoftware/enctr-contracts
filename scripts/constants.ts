export const CONTRACTS: Record<string, string> = {
  DAI: "DAI",
  authority: "EncountrAuthority",
  bondDepo: "EncountrBondDepository",
  bondingCalculator: "EncountrBondingCalculator",
  distributor: "Distributor",
  encountr: "EncountrERC20Token",
  gEnctr: "gENCTR",
  sEnctr: "sEncountr",
  sales: "EncountrPresale",
  pEnctr: "pEncountr",
  vesting: "ExercisepENCTR",
  staking: "EncountrStaking",
  teller: "BondTeller",
  treasury: "EncountrTreasury",
};

// Constructor Arguments
export const TREASURY_TIMELOCK = 6600;

// Constants
export const LARGE_APPROVAL = "100000000000000000000000000000000";
export const EPOCH_LENGTH_IN_BLOCKS = "28800";
export const FIRST_EPOCH_NUMBER = "0";
export const FIRST_EPOCH_TIME = "1653259196"; // TODO!!!
export const INITIAL_REWARD_RATE = "4000";
export const INITIAL_INDEX = "1000000000";
export const BOUNTY_AMOUNT = "100000000";
// For testnet only
export const INITIAL_MINT = "10000" + "0".repeat(18); // 10K deposit.
export const INITIAL_MINT_PROFIT = "10000" + "0".repeat(9);
