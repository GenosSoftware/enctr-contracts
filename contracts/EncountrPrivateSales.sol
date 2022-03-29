// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.7.5;

import "./types/EncountrAccessControlled.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct Sale {
  bool active;
  uint256 id;
  uint256 enctrPerUnit;
  IERC20 purchaseToken;
  address proceedsAddress;
}

contract EncountrPrivateSales is EncountrAccessControlled {

  event SaleStarted(uint256 indexed id, uint256 enctrPerUnit, IERC20 purchaseToken);
  event SaleEnded(uint256 indexed id);
  event BuyerApproved(uint256 indexed id, address indexed buyer);

  IERC20 public enctr;

  mapping(uint256 => mapping(address => bool)) public approvedBuyers;
  mapping(uint256 => Sale) public sales;
  uint256 public currentSaleId;

  constructor(
      IERC20 _enctr,
      address _authority
  ) EncountrAccessControlled(IEncountrAuthority(_authority)) {
    enctr = _enctr;
    currentSaleId = 0;
  }

  function createSale(uint256 enctrPerUnit, IERC20 purchaseToken, address proceedsAddress) external onlyGovernor() returns (uint256) {
    require(enctrPerUnit > 0, "no free lunch!");
    require(sales[currentSaleId].active == false, "sale ongoing!");
    currentSaleId += 1;

    Sale storage newSale = sales[currentSaleId];
    newSale.active = true;
    newSale.id = currentSaleId;
    newSale.enctrPerUnit = enctrPerUnit;
    newSale.purchaseToken = purchaseToken;
    newSale.proceedsAddress = proceedsAddress;

    emit SaleStarted(currentSaleId, enctrPerUnit, purchaseToken);
    return currentSaleId;
  }

  function stopSale(uint256 id) external onlyGovernor() {
    _stop(id);
  }

  function stopCurrentSale() external onlyGovernor() {
    _stop(currentSaleId);
  }

  function _stop(uint256 id) private {
    require(sales[id].active, "sale is not active!");
    sales[id].active = false;
    emit SaleEnded(id);
  }

  function _approveBuyer(uint256 _saleId, address _buyer) internal {
    require(sales[_saleId].active, "sale is not active!");
    require(approvedBuyers[_saleId][_buyer] == false, "buyer is already approved!");
    approvedBuyers[_saleId][_buyer] = true;
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

  function buy(uint256 _saleId, uint256 _amountOfPurchaseToken) external {
    require(sales[_saleId].active, "sale is not active!");
    require(approvedBuyers[_saleId][msg.sender], "buyer not approved!");
    uint256 enctrPurchaseTotal = sales[_saleId].enctrPerUnit * _amountOfPurchaseToken;
    sales[_saleId].purchaseToken.transferFrom(msg.sender, sales[_saleId].proceedsAddress, _amountOfPurchaseToken);
    enctr.transfer(msg.sender, enctrPurchaseTotal);
  }

  function withdrawTokens(address _tokenToWithdraw) external onlyGovernor() {
    IERC20(_tokenToWithdraw).transfer(msg.sender, IERC20(_tokenToWithdraw).balanceOf(address(this)));
  }
}
