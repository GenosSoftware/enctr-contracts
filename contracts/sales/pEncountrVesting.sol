// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5; // solhint-disable-line

import "../types/EncountrAccessControlled.sol";

import "../libraries/SafeMath.sol";
import "../libraries/SafeERC20.sol";

import "../interfaces/IERC20.sol";
import "../interfaces/IENCTR.sol";
import "../interfaces/IpENCTR.sol";
import "../interfaces/ITreasury.sol";

contract ExercisepENCTR is EncountrAccessControlled {
    using SafeMath for uint;
    using SafeERC20 for IERC20;
    using SafeERC20 for IENCTR;
    using SafeERC20 for IpENCTR;

    IpENCTR public immutable pENCTR;
    IENCTR public immutable ENCTR; // solhint-disable-line var-name-mixedcase
    IERC20 public immutable DAI; // solhint-disable-line var-name-mixedcase
    ITreasury public immutable treasury;

    struct Term {
        uint percent; // 4 decimals ( 5000 = 0.5% )
        uint claimed;
        uint max;
    }
    mapping(address => Term) public terms;
    mapping(address => address) public walletChange;

    constructor(
        address _ENCTR, // solhint-disable-line var-name-mixedcase
        address _pENCTR,
        address _DAI, // solhint-disable-line var-name-mixedcase
        address _treasury,
        address _authority
    ) EncountrAccessControlled(IEncountrAuthority(_authority)) {
        require(_ENCTR != address(0), "zero address.");
        ENCTR = IENCTR(_ENCTR);

        require(_pENCTR != address(0), "zero address.");
        pENCTR = IpENCTR(_pENCTR);

        require(_DAI != address(0), "zero address.");
        DAI = IERC20(_DAI);

        require(_treasury != address(0), "zero address.");
        treasury = ITreasury(_treasury);
    }

    // Sets terms for a new wallet
    function setTerms(address _vester, uint _rate, uint _claimed, uint _max) external onlyGovernor() {
        require(_max >= terms[ _vester ].max, "cannot lower amount claimable");
        require(_rate >= terms[ _vester ].percent, "cannot lower vesting rate");
        require(_claimed >= terms[ _vester ].claimed, "cannot lower claimed");
        require(pENCTR.isApprovedSeller(_vester), "the vester has not been approved");

        terms[_vester] = Term({
            percent: _rate,
            claimed: _claimed,
            max: _max
        });
    }

    // Allows wallet to redeem pENCTR for ENCTR
    function exercise(uint _amount) external {
        Term memory info = terms[msg.sender];

        require(redeemable(info) >= _amount, "Not enough vested");
        require(info.max.sub(info.claimed) >= _amount, "Claimed over max");

        DAI.safeTransferFrom(msg.sender, address(this), _amount);
        pENCTR.safeTransferFrom(msg.sender, address(this), _amount);

        DAI.approve(address(treasury), _amount);
        uint toSend = treasury.deposit(_amount, address(DAI), 0);

        terms[msg.sender].claimed = info.claimed.add(_amount);

        ENCTR.safeTransfer(msg.sender, toSend);
    }

    // Allows wallet owner to transfer rights to a new address
    function pushWalletChange(address _newWallet) external {
        require(msg.sender != _newWallet, "must specify a new wallet");
        require(terms[msg.sender].percent != 0, "not a participating wallet");
        walletChange[msg.sender] = _newWallet;
    }

    // Allows wallet to pull rights from an old address
    function pullWalletChange(address _oldWallet) external {
        require(walletChange[_oldWallet] == msg.sender, "wallet did not push");

        walletChange[_oldWallet] = address(0);
        terms[msg.sender] = terms[_oldWallet];
        delete terms[_oldWallet];
    }

    // Amount a wallet can redeem based on current supply
    function redeemableFor(address _vester) public view returns (uint) {
        return redeemable(terms[_vester]);
    }

    function redeemable(Term memory _info) internal view returns (uint) {
        return (ENCTR.totalSupply().mul(_info.percent).div(1000000)).sub(_info.claimed);
    }
}
