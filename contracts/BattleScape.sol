// contracts/BattleScape.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import './Encountr.sol';

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
  uint256 wageredAmountForActualOutcome; // the amount of money wagered towards the actual outcome (used in calculation)
}

contract BattleScape is Initializable, Context {
  using SafeMath for uint256;
  using Address for address;

  event WagerCreated(address indexed enctr, uint256 indexed outcome, uint256 amount);
  event WagerCancelled(address indexed enctr, address indexed player);
  event EarningsCollected(address indexed enctr, address indexed player, uint256 earnings);
  event EnctrFinished(address indexed enctr, uint256 indexed actualOutcome, uint256 wageredAmountForActualOutcome);
  event EarningsCalculated(address indexed player, uint256 percent, uint256 earnings);
  event TestingOutput(uint256 outcome, uint256 actualOutcome);

  mapping(address => Enctr) public _enctrs;
  mapping(address => mapping(address => Wager)) public _wagers;
  Encountr e;

  function initialize(address payable encountr_addr) public initializer {
    e = Encountr(encountr_addr);
  }

  function wager(address payable enctr, uint256 outcome, uint256 amount) public {
    require(amount > 0, "you need to wager at least some tokens");
    require(_wagers[_msgSender()][enctr].amount == 0, "a wager has already been placed for this event");

    uint256 allowance = e.allowance(_msgSender(), address(this));
    require(allowance >= amount, "check the token allowance");

    bool success = e.transferFrom(_msgSender(), enctr, amount);
    require(success, "unable to pay for wager");

    _wagers[_msgSender()][enctr] = Wager(outcome, amount, 0);
    // Add this address as a player in the Encoutr
    _enctrs[enctr].players.push(_msgSender());
    emit WagerCreated(enctr, outcome, amount);
  }

  function cancelWager(address payable enctr) public {
    uint256 amount = _wagers[_msgSender()][enctr].amount;
    require(amount > 0, "no bet to cancel");
    require(e.allowance(enctr, address(this)) >= amount, "check token allowance");

    bool success = e.transferFrom(enctr, _msgSender(), amount);
    require(success, "unable to return wager");

    _wagers[_msgSender()][enctr] = Wager(0, 0, 0);
    emit WagerCancelled(enctr, _msgSender());
  }

  /**
    * @dev Only the owner of the encountr can finish an enctr and it can only be finished once. 
    */
  function finishEnctr(uint256 actualOutcome, uint256 amount) public {
    require(_enctrs[_msgSender()].actualOutcome == 0, "the outcome has already been set");
    _enctrs[_msgSender()].actualOutcome = actualOutcome;
    _enctrs[_msgSender()].wageredAmountForActualOutcome = amount; // calculated off-chain

    emit EnctrFinished(_msgSender(), actualOutcome, _enctrs[_msgSender()].wageredAmountForActualOutcome);
  }

  /**
   * @dev Calculates the earnings of the player depending on the percentage of tokens contributed to winners wagerred total.
   *      Will loop through the winners off-chain and call increaseAllowance to them based on the earnings here.
   */
  function calculateEarnings(address enctr, address payable player) public {
    if(_enctrs[enctr].actualOutcome != _wagers[player][enctr].outcome) {
      emit TestingOutput(_wagers[player][enctr].outcome, _enctrs[enctr].actualOutcome);
      return;
    } 
    // else {   DONT THINK WE NEED A WINNERS ARRAY? WASTE OF GAS We can already find all the wagers for free
    //   _enctrs[enctr].winners.push(player);
    // }
    uint256 percent = _wagers[player][enctr].amount.div(_enctrs[enctr].wageredAmountForActualOutcome);
    _wagers[player][enctr].earnings = e.balanceOf(enctr).mul(percent);

    emit EarningsCalculated(player, percent, _wagers[player][enctr].earnings);
  }

  /**
  * @dev Collect earnings from the enctr/event. This function should only be called after increaseAllowance() is called.
  */
  function collectEarnings(address payable enctr) public {
    uint256 earnings = _wagers[_msgSender()][enctr].earnings;
    require(earnings > 0, "no earnings from this enctr");
    require(e.allowance(enctr, address(this)) >= earnings, "check token allowance");

    bool success = e.transferFrom(enctr, _msgSender(), earnings);
    require(success, "unable to collect earnings");

    emit EarningsCollected(enctr, _msgSender(), earnings);
  }

  function getOutcome(address enctr) public view returns (uint256) {
    return _enctrs[enctr].actualOutcome;
  }

  function getEnctr(address enctr) public view returns (address[] memory, uint256, uint256) {
    return (_enctrs[enctr].players, _enctrs[enctr].actualOutcome, _enctrs[enctr].wageredAmountForActualOutcome);
  }

  function getWager(address enctr) public view returns (uint256, uint256) {
    return (_wagers[_msgSender()][enctr].outcome, _wagers[_msgSender()][enctr].amount);
  }

  function getPlayerWagerForEnctr(address enctr, address player) public view returns (uint256, uint256, uint256) {
    return (_wagers[player][enctr].outcome, _wagers[player][enctr].amount, _wagers[player][enctr].earnings);
  }

}
