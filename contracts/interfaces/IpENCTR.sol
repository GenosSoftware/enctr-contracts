// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

import "./IERC20.sol";

interface IpENCTR is IERC20 {
    function isApprovedSeller(address account_) external returns (bool);
}
