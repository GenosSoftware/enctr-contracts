// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.5;

import "../types/EncountrAccessControlled.sol";
import "../types/ERC20Permit.sol";

import "../libraries/SafeMath.sol";

contract pEncountr is ERC20Permit, EncountrAccessControlled { // solhint-disable-line contract-name-camelcase
    using SafeMath for uint256;

    bool public requireSellerApproval;
    bool public allowMinting;

    mapping(address => bool) public isApprovedSeller;

    constructor(
        address _authority
    )
        ERC20("pEncountr", "pENCTR", 18)
        ERC20Permit("pEncountr")
        EncountrAccessControlled(IEncountrAuthority(_authority))
    {
        requireSellerApproval = true;
        allowMinting = true;
        _addApprovedSeller(address(0));
        _addApprovedSeller(address(this));
        _addApprovedSeller(msg.sender);
        uint256 initialSupply_ = 1e9 * 1e18;
        _mint(msg.sender, initialSupply_);
    }

    function allowOpenTrading() external onlyGovernor() returns (bool) {
        requireSellerApproval = false;
        return requireSellerApproval;
    }

    function disableMinting() external onlyGovernor() returns (bool) {
        allowMinting = false;
        return allowMinting;
    }

    function _addApprovedSeller(address approvedSeller_) internal {
        isApprovedSeller[approvedSeller_] = true;
    }

    function addApprovedSeller(address approvedSeller_) external onlyGovernor() returns ( bool ) {
        _addApprovedSeller(approvedSeller_);
        return isApprovedSeller[approvedSeller_];
    }

    function addApprovedSellers(address[] calldata approvedSellers_) external onlyGovernor() returns ( bool ) {
        for(uint256 iteration_; approvedSellers_.length > iteration_; iteration_++) {
            _addApprovedSeller(approvedSellers_[iteration_]);
        }
        return true;
    }

    function _removeApprovedSeller(address disapprovedSeller_) internal {
        isApprovedSeller[disapprovedSeller_] = false;
    }

    function removeApprovedSeller(address disapprovedSeller_) external onlyGovernor() returns ( bool ) {
        _removeApprovedSeller(disapprovedSeller_);
        return isApprovedSeller[disapprovedSeller_];
    }

    function removeApprovedSellers(address[] calldata disapprovedSellers_) external onlyGovernor() returns ( bool ) {

        for(uint256 iteration_; disapprovedSellers_.length > iteration_; iteration_++) {
            _removeApprovedSeller(disapprovedSellers_[iteration_]);
        }
        return true;
    }

    function _beforeTokenTransfer(address from_, address, uint256) internal view override {
        require((!requireSellerApproval || isApprovedSeller[from_] == true), "not approved to transfer pENCTR.");
    }

    function mint(address recipient_, uint256 amount_) public virtual onlyGovernor() {
        require(allowMinting, "Minting has been disabled.");
        _mint(recipient_, amount_);
    }
}
