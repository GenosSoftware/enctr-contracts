/**
 *
 *  Encountr Token (V2.0).
 *
 *  This token powers the Encountr e-sports/sports platform. www.encountr.app
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Encountr is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    address private _swapRouterAddress;
    bool private _tradingOpen;

    uint256 public autoLiquidityPercentage;
    bool private _inAutoLiquidity;
    bool public autoLiquidityEnabled;

    uint256 public taxFee;
    address public taxCollector;
    mapping (address => bool) private _isExcludedFromTax;

    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;

    event AutoLiquidityEnabledUpdated(bool enabled);
    event AutoLiquidityGenerated(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiquidity
    );

    modifier autoLiquidityLock {
        _inAutoLiquidity = true;
        _;
        _inAutoLiquidity = false;
    }

    function initialize(
        uint256 initialSupply,
        address swapRouterAddress
    )
        public initializer
    {
        ERC20Upgradeable.__ERC20_init("Encountr", "ENCTR");
        OwnableUpgradeable.__Ownable_init();

        _swapRouterAddress = swapRouterAddress;

        autoLiquidityEnabled = true;
        autoLiquidityPercentage = 8;

        taxFee = 3;
        taxCollector = address(this);
        _isExcludedFromTax[taxCollector] = true;
        _isExcludedFromTax[owner()] = true;

        _mint(owner(), initialSupply * (10 ** uint256(decimals())));
    }

    function openTrading() external onlyOwner {
        require(!_tradingOpen, "trading is already open");
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(_swapRouterAddress);
        uniswapV2Router = _uniswapV2Router;

        _approve(address(this), address(uniswapV2Router), totalSupply());

        uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory()).createPair(address(this), _uniswapV2Router.WETH());
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(address(this), balanceOf(address(this)), 0, 0, owner(), block.timestamp);

       _tradingOpen = true;
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint).max);
    }

    function setAutoLiquidityEnabled(bool _enabled) public onlyOwner {
        autoLiquidityEnabled = _enabled;
        emit AutoLiquidityEnabledUpdated(_enabled);
    }

    function handleLiquidity(address from, uint256 amount) private returns (uint256) {
        if (!_inAutoLiquidity && from != uniswapV2Pair && autoLiquidityEnabled) {
            require(super.transferFrom(from, address(this), amount), "auto-liquidity transferFrom failed");
            autoLiquify(amount);
            return 0;
        }

        return amount;
    }

    function autoLiquify(uint256 amount) private autoLiquidityLock {
        uint256 half = amount / 2;
        uint256 otherHalf = amount - half;

        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        swapTokensForEth(half);

        uint256 newBalance = address(this).balance - initialBalance;

        addLiquidity(otherHalf, newBalance);

        emit AutoLiquidityGenerated(half, newBalance, otherHalf);
    }

    function swapTokensForEth(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        _approve(address(this), address(uniswapV2Router), tokenAmount);

        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner(),
            block.timestamp
        );
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
      if (_isExcludedFromTax[recipient] || _isExcludedFromTax[_msgSender()]) {
        require(super.transfer(recipient, amount), "untaxed transfer failed");
        return true;
      }

      uint256 tax;
      uint256 autoLiquidity;
      uint256 remainder;
      (tax, autoLiquidity, remainder) = _calculateTax(amount);

      uint256 unhandledAmount = handleLiquidity(_msgSender(), autoLiquidity);
      remainder = remainder + unhandledAmount; // We may fail to add liquidity because of a lock.

      require(super.transfer(taxCollector, tax), "tax transfer failed");
      require(super.transfer(recipient, remainder), "post-tax transfer failed");

      return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
      if (_isExcludedFromTax[recipient] || _isExcludedFromTax[sender]) {
        require(super.transferFrom(sender, recipient, amount), "untaxed transferFrom failed");
        return true;
      }

      uint256 tax;
      uint256 autoLiquidity;
      uint256 remainder;
      (tax, autoLiquidity, remainder) = _calculateTax(amount);

      uint256 unhandledAmount = handleLiquidity(sender, autoLiquidity);
      remainder = remainder + unhandledAmount; // We may fail to add liquidity because of a lock.

      require(super.transferFrom(sender, taxCollector, tax), "tax transferFrom failed");
      require(super.transferFrom(sender, recipient, remainder), "post-tax transferFrom failed");

      return true;
    }

    function _calculateTax(uint256 amount) private view returns (uint256, uint256, uint256) {
      uint256 tax = (amount * taxFee) / 10**2;
      uint256 autoLiquidity = (amount * autoLiquidityPercentage) / 10**2;
      uint256 remainder = amount - tax - autoLiquidity;
      return (tax, autoLiquidity, remainder);
    }

    function excludeFromTax(address account) external onlyOwner {
        _isExcludedFromTax[account] = true;
    }

    function includeInTax(address account) external onlyOwner {
        _isExcludedFromTax[account] = false;
    }

    function setTaxPercentage(uint256 taxPercentage) external onlyOwner {
        taxFee = taxPercentage;
    }
}

interface IUniswapV2Factory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setFeeTo(address) external;
    function setFeeToSetter(address) external;
}

interface IUniswapV2Pair {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external pure returns (string memory);
    function symbol() external pure returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);

    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function skim(address to) external;
    function sync() external;

    function initialize(address, address) external;
}

interface IUniswapV2Router01 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountToken, uint amountETH);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Router02 is IUniswapV2Router01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountETH);
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}
