// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.7.5;

import "../interfaces/IERC20.sol";
import "../types/Ownable.sol";

contract EnctrFaucet is Ownable {
    IERC20 public encountr;

    constructor(address _encountr) {
        encountr = IERC20(_encountr);
    }

    function setEnctr(address _encountr) external onlyOwner {
        encountr = IERC20(_encountr);
    }

    function dispense() external {
        encountr.transfer(msg.sender, 1e9);
    }
}
