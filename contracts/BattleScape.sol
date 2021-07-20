// contracts/BattleScape.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import './Encountr.sol';

struct Wager {
   uint256 outcome;
   uint256 amount;
}

contract BattleScape is Initializable {
  event WagerCreated(address indexed evt, uint256 indexed outcome, uint256 amount);

  mapping(address => mapping(address => Wager)) public _wagers;
  Encountr e;

  function initialize(address payable encountr_addr) public initializer {
    e = Encountr(encountr_addr);
  }

  function wager(address payable evt, uint256 outcome, uint256 amount) public {
    require(amount > 0, "you need to wager at least some tokens");
    require(_wagers[msg.sender][evt].amount == 0, "a wager has already been placed for this event");

    uint256 allowance = e.allowance(msg.sender, address(this));
    require(allowance >= amount, "check the token allowance");

    bool success = e.transferFrom(msg.sender, evt, amount);
    require(success, "unable to pay for wager");

    _wagers[msg.sender][evt] = Wager(outcome, amount);
    emit WagerCreated(evt, outcome, amount);
  }

  function getWager(address evt) public view returns (uint256, uint256) {
    return (_wagers[msg.sender][evt].outcome, _wagers[msg.sender][evt].amount);
  }
}
