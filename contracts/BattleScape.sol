// contracts/BattleScape.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct Wager {
  uint256 outcome;
  uint256 amount;
  uint256 earnings;
}

/**
  * @dev Enctrs are initialized when the mapping is created.
  */
struct Enctr {
  address[] players;
  uint256 actualOutcome;
  uint256 finalBalance;
  uint256 finalBalanceNetFee;
  bool started;
  mapping(uint256 => uint256) outcomesToWageredAmount; // outcome -> $ wagered for that outcome
}

contract BattleScape is Initializable, ContextUpgradeable {
  event WagerCreated(address indexed enctr, address indexed player, uint256 indexed outcome, uint256 amount);
  event WagerCancelled(address indexed enctr, address indexed player);
  event EarningsCollected(address indexed enctr, address indexed player, uint256 earnings);
  event EnctrFinished(address indexed enctr, uint256 indexed actualOutcome, uint256 wageredAmountForActualOutcome, uint256 balanceLeft, uint256 fee);
  event EarningsCalculated(address indexed enctr, address indexed player, uint256 percent, uint256 earnings, uint256 balance, uint256 wagerTotalForActualOutcome);
  event TestingOutput(uint256 outcome, uint256 actualOutcome);

  mapping(address => Enctr) public _enctrs;
  mapping(address => mapping(address => Wager)) public _wagers;
  IERC20 private _exchangeToken;
  address payable private _transactionWallet;

  function initialize(IERC20 exchangeToken, address payable transactionWallet) public initializer {
    ContextUpgradeable.__Context_init();
    _exchangeToken = exchangeToken;
    _transactionWallet = transactionWallet;
  }

  function wager(address payable enctr, uint256 outcome, uint256 amount) external {
    require(amount > 0, "wager at least one (1) token");
    require(_wagers[_msgSender()][enctr].amount == 0, "wager has already been made");
    require(_enctrs[enctr].started == false, "match has already started");

    uint256 allowance = _exchangeToken.allowance(_msgSender(), address(this));
    require(allowance >= amount, "check the token allowance");

    bool success = _exchangeToken.transferFrom(_msgSender(), enctr, amount);
    require(success, "unable to pay for wager");

    _wagers[_msgSender()][enctr] = Wager(outcome, amount, 0);
    // Register the sender (better) as participating in the event.
    _enctrs[enctr].players.push(_msgSender());
    // Update the total amount wagered for the selected outcome in the event.
    _enctrs[enctr].outcomesToWageredAmount[outcome] = _enctrs[enctr].outcomesToWageredAmount[outcome] + amount;
    // Update the total amount wagered for the event.
    _enctrs[enctr].finalBalance = _enctrs[enctr].finalBalance + amount;
    emit WagerCreated(enctr, _msgSender(), outcome, amount);
  }

  function cancelWager(address payable enctr) external {
    uint256 amount = _wagers[_msgSender()][enctr].amount;
    uint256 outcome = _wagers[_msgSender()][enctr].outcome;
    require(_enctrs[enctr].started == false, "match has already started");
    require(amount > 0, "no bet to cancel");
    require(_exchangeToken.allowance(enctr, address(this)) >= amount, "check token allowance");

    bool success = _exchangeToken.transferFrom(enctr, _msgSender(), amount);
    require(success, "unable to return wager");

    _wagers[_msgSender()][enctr] = Wager(0, 0, 0);

    // Update the total amount wagered for the selected outcome in the event.
    _enctrs[enctr].outcomesToWageredAmount[outcome] = _enctrs[enctr].outcomesToWageredAmount[outcome] - amount;
    // Update the total amount wagered for the event.
    _enctrs[enctr].finalBalance = _enctrs[enctr].finalBalance - amount;

    emit WagerCancelled(enctr, _msgSender());
  }

  /**
    * @dev Enctr can only be started once and only by the owner of the Enctr.
    */
  function startEnctr() external {
    require(_enctrs[_msgSender()].started == false, "match has already started");
    _enctrs[_msgSender()].started = true;
  }

  /**
    * @dev Only the owner of the encountr can finish an enctr and it can only be finished once. 2% fee goes to Enctr Team
    */
  function finishEnctr(uint256 actualOutcome) external {
    require(_enctrs[_msgSender()].actualOutcome == 0, "the outcome has already been set");
    _enctrs[_msgSender()].actualOutcome = actualOutcome;
    _enctrs[_msgSender()].finalBalance = _exchangeToken.balanceOf(_msgSender());

    uint256 transactionFee = _enctrs[_msgSender()].finalBalance * 2 / (10**2);
    bool success = _exchangeToken.transferFrom(_msgSender(), _transactionWallet, transactionFee);
    require(success, "unable to pay transaction fee");
    _enctrs[_msgSender()].finalBalanceNetFee = _exchangeToken.balanceOf(_msgSender());

    emit EnctrFinished(_msgSender(), actualOutcome, _enctrs[_msgSender()].outcomesToWageredAmount[actualOutcome], _enctrs[_msgSender()].finalBalance, transactionFee);
  }

  /**
    * @dev Calculates the earnings of the player depending on the percentage of tokens contributed to winners wagerred total.
    *      Will loop through the winners off-chain and call increaseAllowance to them based on the earnings here.
    */
  function _calculateEarnings(address enctr) private returns (uint256) {
    if(_enctrs[enctr].actualOutcome != _wagers[_msgSender()][enctr].outcome) {
      return 0;
    }

    uint256 _balance = _enctrs[enctr].finalBalanceNetFee;
    uint256 _numerator = _wagers[_msgSender()][enctr].amount * 10**10; // Amount user wagered
    uint256 _denominator = _enctrs[enctr].outcomesToWageredAmount[_enctrs[enctr].actualOutcome]; // Total Amount Wagered for this Outcome
    uint256 _percent = (_numerator / _denominator);
    _wagers[_msgSender()][enctr].earnings = _balance * _percent / 10**10;

    emit EarningsCalculated(enctr, _msgSender(), _percent, _wagers[_msgSender()][enctr].earnings, _exchangeToken.balanceOf(enctr), _enctrs[enctr].outcomesToWageredAmount[_enctrs[enctr].actualOutcome]);
    return _wagers[_msgSender()][enctr].earnings;
  }

  /**
    * @dev Collect earnings from the enctr/event. This function should only be called after increaseAllowance() is called.
    */
  function collectEarnings(address payable enctr) external {
    // TODO: confirm it isn't possible call this before it's over
    uint256 earnings = _calculateEarnings(enctr);
    require(earnings > 0, "no earnings from this enctr");
    require(_exchangeToken.allowance(enctr, address(this)) >= earnings, "check token allowance");

    bool success = _exchangeToken.transferFrom(enctr, _msgSender(), earnings);
    require(success, "unable to collect earnings");

    emit EarningsCollected(enctr, _msgSender(), earnings);
  }

  function getOutcome(address enctr) external view returns (uint256) {
    return _enctrs[enctr].actualOutcome;
  }

  function getEnctr(address enctr) external view returns (address[] memory, uint256, uint256, uint256, bool) {
    return (_enctrs[enctr].players, _enctrs[enctr].actualOutcome, _enctrs[enctr].outcomesToWageredAmount[_enctrs[enctr].actualOutcome], _enctrs[enctr].finalBalance, _enctrs[enctr].started);
  }

  function getEnctrTotalWagerForOutcome(address enctr, uint256 outcome) external view returns (uint256) {
    return _enctrs[enctr].outcomesToWageredAmount[outcome];
  }

  function getWager(address enctr) external view returns (uint256, uint256) {
    return (_wagers[_msgSender()][enctr].outcome, _wagers[_msgSender()][enctr].amount);
  }

  function getPlayerWagerForEnctr(address enctr, address player) external view returns (uint256, uint256, uint256) {
    return (_wagers[player][enctr].outcome, _wagers[player][enctr].amount, _wagers[player][enctr].earnings);
  }

}
