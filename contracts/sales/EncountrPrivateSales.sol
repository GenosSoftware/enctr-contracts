// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.7.5;

import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/ITreasury.sol";

import "../types/EncountrAccessControlled.sol";

import "../libraries/SafeERC20.sol";
import "../libraries/SafeMath.sol";

struct Sale {
    bool active;
    uint256 id;
    uint256 tokenPrice;
    IERC20 saleToken;
    IERC20 purchaseToken;
    bool isTreasuryDeposit;
    uint256 maxTokensForSale;
    uint256 totalTokensSold;
    uint256 maxTokensForAddress;
}

contract EncountrPrivateSales is EncountrAccessControlled {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event SaleStarted(uint256 indexed id, uint256 tokenPrice, IERC20 saleToken, IERC20 purchaseToken);
    event SaleEnded(uint256 indexed id);
    event BuyerApproved(uint256 indexed id, address indexed buyer);

    ITreasury public treasury;

    mapping(uint256 => mapping(address => uint256)) public buyerAllowances;
    mapping(uint256 => Sale) public sales;
    uint256 public currentSaleId;

    constructor(
        ITreasury _treasury,
        address _authority
    ) EncountrAccessControlled(IEncountrAuthority(_authority)) {
        treasury = _treasury;
        currentSaleId = 0;
    }

    function createSale(
        uint256 tokenPrice,
        address saleToken,
        address purchaseToken,
        bool isTreasuryDeposit,
        uint256 maxTokensForSale,
        uint256 maxTokensForAddress
    ) external onlyGovernor() returns (uint256) {
        if (isTreasuryDeposit) {
            require(tokenPrice >= 10**IERC20Metadata(purchaseToken).decimals(), "need ENCTR backing!");
        } else {
            require(tokenPrice > 0, "no free lunch!");
        }

        require(sales[currentSaleId].active == false, "sale ongoing!");
        require(treasury.isPermitted(2, purchaseToken), "not a valid purchase token!");

        currentSaleId += 1;

        Sale storage newSale = sales[currentSaleId];
        newSale.active = true;
        newSale.id = currentSaleId;
        newSale.tokenPrice = tokenPrice;
        newSale.saleToken = IERC20(saleToken);
        newSale.purchaseToken = IERC20(purchaseToken);
        newSale.isTreasuryDeposit = isTreasuryDeposit;
        newSale.maxTokensForSale = maxTokensForSale;
        newSale.totalTokensSold = 0;
        newSale.maxTokensForAddress = maxTokensForAddress;

        emit SaleStarted(currentSaleId, tokenPrice, IERC20(saleToken), IERC20(purchaseToken));
        return currentSaleId;
    }

    function stopSale(uint256 id) external onlyGovernor() {
        _stop(id);
    }

    function stopCurrentSale() external onlyGovernor() {
        _stop(currentSaleId);
    }

    function _stop(uint256 id) internal {
        require(sales[id].active, "sale is not active!");
        sales[id].active = false;
        emit SaleEnded(id);
    }

    function _approveBuyer(uint256 _saleId, address _buyer) internal {
        require(sales[_saleId].active, "sale is not active!");
        buyerAllowances[_saleId][_buyer] = sales[_saleId].maxTokensForAddress;
        emit BuyerApproved(_saleId, _buyer);
    }

    function approveBuyer(uint256 _saleId, address _buyer) external onlyGovernor() {
        _approveBuyer(_saleId, _buyer);
    }

    function approveBuyers(uint256 _saleId, address[] calldata _newBuyers) external onlyGovernor() returns (uint256) {
        for(uint256 i = 0; i < _newBuyers.length; i++) {
            _approveBuyer(_saleId, _newBuyers[i]);
        }

        return _newBuyers.length;
    }

    function _buyFromTreasury(uint256 _saleId, uint256 _amountOfEnctr) internal {
        uint8 decimals = IERC20Metadata(address(sales[_saleId].saleToken)).decimals();
        uint256 totalPrice = sales[_saleId].tokenPrice.mul(_amountOfEnctr).div(10**decimals);

        sales[_saleId].purchaseToken.safeTransferFrom(msg.sender, address(this), totalPrice);
        sales[_saleId].purchaseToken.safeApprove(address(treasury), totalPrice);
        treasury.deposit(
            totalPrice,
            address(sales[_saleId].purchaseToken),
            totalPrice.div(10**decimals).sub(_amountOfEnctr)
        );

        sales[_saleId].saleToken.safeTransfer(msg.sender, _amountOfEnctr);
    }

    function _buyFromContract(uint256 _saleId, uint256 _amountOfEnctr) internal {
        uint8 decimals = IERC20Metadata(address(sales[_saleId].saleToken)).decimals();
        uint256 totalPrice = sales[_saleId].tokenPrice.mul(_amountOfEnctr).div(10**decimals);
        sales[_saleId].purchaseToken.safeTransferFrom(msg.sender, address(this), totalPrice);
        sales[_saleId].saleToken.safeTransfer(msg.sender, _amountOfEnctr);
    }

    function buy(uint256 _saleId, uint256 _amountOfEnctr) external {
        require(sales[_saleId].active, "sale is not active!");
        require(buyerAllowances[_saleId][msg.sender] >= _amountOfEnctr, "buyer not approved!");
        require(sales[_saleId].totalTokensSold + _amountOfEnctr <= sales[_saleId].maxTokensForSale, "sold out!");

        if (sales[_saleId].isTreasuryDeposit) {
            _buyFromTreasury(_saleId, _amountOfEnctr);
        } else {
            _buyFromContract(_saleId, _amountOfEnctr);
        }

        buyerAllowances[_saleId][msg.sender] -= _amountOfEnctr;
        sales[_saleId].totalTokensSold += _amountOfEnctr;
    }

    function withdrawTokens(address _tokenToWithdraw) external onlyGovernor() {
        IERC20(_tokenToWithdraw).transfer(msg.sender, IERC20(_tokenToWithdraw).balanceOf(address(this)));
    }
}
