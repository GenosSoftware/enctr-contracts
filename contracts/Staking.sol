// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.5;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IsENCTR.sol";
import "./interfaces/IgENCTR.sol";
import "./interfaces/IDistributor.sol";

import "./types/EncountrAccessControlled.sol";

contract EncountrStaking is EncountrAccessControlled {
    /* ========== DEPENDENCIES ========== */

    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SafeERC20 for IsENCTR;
    using SafeERC20 for IgENCTR;

    /* ========== EVENTS ========== */

    event DistributorSet(address distributor);
    event Stake(address staker);
    event WarmupSet(uint256 warmup);

    /* ========== DATA STRUCTURES ========== */

    struct Epoch {
        uint256 length; // in seconds
        uint256 number; // since inception
        uint256 end; // timestamp
        uint256 distribute; // amount
    }

    struct Claim {
        uint256 deposit; // if forfeiting
        uint256 gons; // staked balance
        uint256 expiry; // end of warmup period
        bool lock; // prevents malicious delays for claim
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable ENCTR;
    IsENCTR public immutable sENCTR;
    IgENCTR public immutable gENCTR;

    Epoch public epoch;

    IDistributor public distributor;

    mapping(address => Claim) public warmupInfo;
    uint256 public warmupPeriod;
    uint256 private gonsInWarmup;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _encountr,
        address _sENCTR,
        address _gENCTR,
        uint256 _epochLength,
        uint256 _firstEpochNumber,
        uint256 _firstEpochTime,
        address _authority
    ) EncountrAccessControlled(IEncountrAuthority(_authority)) {
        require(_encountr != address(0), "Zero address: ENCTR");
        ENCTR = IERC20(_encountr);
        require(_sENCTR != address(0), "Zero address: sENCTR");
        sENCTR = IsENCTR(_sENCTR);
        require(_gENCTR != address(0), "Zero address: gENCTR");
        gENCTR = IgENCTR(_gENCTR);

        epoch = Epoch({length: _epochLength, number: _firstEpochNumber, end: _firstEpochTime, distribute: 0});
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice stake ENCTR to enter warmup
     * @param _to address
     * @param _amount uint
     * @param _claim bool
     * @param _rebasing bool
     * @return uint
     */
    function stake(
        address _to,
        uint256 _amount,
        bool _rebasing,
        bool _claim
    ) external returns (uint256) {
        ENCTR.safeTransferFrom(msg.sender, address(this), _amount);
        _amount = _amount.add(rebase()); // add bounty if rebase occurred
        emit Stake(_to);
        if (_claim && warmupPeriod == 0) {
            return _send(_to, _amount, _rebasing);
        } else {
            Claim memory info = warmupInfo[_to];
            if (!info.lock) {
                require(_to == msg.sender, "External deposits for account are locked");
            }

            warmupInfo[_to] = Claim({
                deposit: info.deposit.add(_amount),
                gons: info.gons.add(sENCTR.gonsForBalance(_amount)),
                expiry: epoch.number.add(warmupPeriod),
                lock: info.lock
            });

            gonsInWarmup = gonsInWarmup.add(sENCTR.gonsForBalance(_amount));

            return _amount;
        }
    }

    /**
     * @notice retrieve stake from warmup
     * @param _to address
     * @param _rebasing bool
     * @return uint
     */
    function claim(address _to, bool _rebasing) public returns (uint256) {
        Claim memory info = warmupInfo[_to];

        if (!info.lock) {
            require(_to == msg.sender, "External claims for account are locked");
        }

        if (epoch.number >= info.expiry && info.expiry != 0) {
            delete warmupInfo[_to];

            gonsInWarmup = gonsInWarmup.sub(info.gons);

            return _send(_to, sENCTR.balanceForGons(info.gons), _rebasing);
        }
        return 0;
    }

    /**
     * @notice forfeit stake and retrieve ENCTR
     * @return uint
     */
    function forfeit() external returns (uint256) {
        Claim memory info = warmupInfo[msg.sender];
        delete warmupInfo[msg.sender];

        gonsInWarmup = gonsInWarmup.sub(info.gons);

        ENCTR.safeTransfer(msg.sender, info.deposit);

        return info.deposit;
    }

    /**
     * @notice prevent new deposits or claims from ext. address (protection from malicious activity)
     */
    function toggleLock() external {
        warmupInfo[msg.sender].lock = !warmupInfo[msg.sender].lock;
    }

    /**
     * @notice redeem sENCTR for ENCTRs
     * @param _to address
     * @param _amount uint
     * @param _trigger bool
     * @param _rebasing bool
     * @return amount_ uint
     */
    function unstake(
        address _to,
        uint256 _amount,
        bool _trigger,
        bool _rebasing
    ) external returns (uint256 amount_) {
        amount_ = _amount;
        uint256 bounty;
        if (_trigger) {
            bounty = rebase();
        }
        if (_rebasing) {
            sENCTR.safeTransferFrom(msg.sender, address(this), _amount);
            amount_ = amount_.add(bounty);
        } else {
            gENCTR.burn(msg.sender, _amount); // amount was given in gENCTR terms
            amount_ = gENCTR.balanceFrom(amount_).add(bounty); // convert amount to ENCTR terms & add bounty
        }

        require(amount_ <= ENCTR.balanceOf(address(this)), "Insufficient ENCTR balance in contract");
        ENCTR.safeTransfer(_to, amount_);
    }

    /**
     * @notice convert _amount sENCTR into gBalance_ gENCTR
     * @param _to address
     * @param _amount uint
     * @return gBalance_ uint
     */
    function wrap(address _to, uint256 _amount) external returns (uint256 gBalance_) {
        sENCTR.safeTransferFrom(msg.sender, address(this), _amount);
        gBalance_ = gENCTR.balanceTo(_amount);
        gENCTR.mint(_to, gBalance_);
    }

    /**
     * @notice convert _amount gENCTR into sBalance_ sENCTR
     * @param _to address
     * @param _amount uint
     * @return sBalance_ uint
     */
    function unwrap(address _to, uint256 _amount) external returns (uint256 sBalance_) {
        gENCTR.burn(msg.sender, _amount);
        sBalance_ = gENCTR.balanceFrom(_amount);
        sENCTR.safeTransfer(_to, sBalance_);
    }

    /**
     * @notice trigger rebase if epoch over
     * @return uint256
     */
    function rebase() public returns (uint256) {
        uint256 bounty;
        if (epoch.end <= block.timestamp) {
            sENCTR.rebase(epoch.distribute, epoch.number);

            epoch.end = epoch.end.add(epoch.length);
            epoch.number++;

            if (address(distributor) != address(0)) {
                distributor.distribute();
                bounty = distributor.retrieveBounty(); // Will mint encountr for this contract if there exists a bounty
            }
            uint256 balance = ENCTR.balanceOf(address(this));
            uint256 staked = sENCTR.circulatingSupply();
            if (balance <= staked.add(bounty)) {
                epoch.distribute = 0;
            } else {
                epoch.distribute = balance.sub(staked).sub(bounty);
            }
        }
        return bounty;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    /**
     * @notice send staker their amount as sENCTR or gENCTR
     * @param _to address
     * @param _amount uint
     * @param _rebasing bool
     */
    function _send(
        address _to,
        uint256 _amount,
        bool _rebasing
    ) internal returns (uint256) {
        if (_rebasing) {
            sENCTR.safeTransfer(_to, _amount); // send as sENCTR (equal unit as ENCTR)
            return _amount;
        } else {
            gENCTR.mint(_to, gENCTR.balanceTo(_amount)); // send as gENCTR (convert units from ENCTR)
            return gENCTR.balanceTo(_amount);
        }
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice returns the sENCTR index, which tracks rebase growth
     * @return uint
     */
    function index() public view returns (uint256) {
        return sENCTR.index();
    }

    /**
     * @notice total supply in warmup
     */
    function supplyInWarmup() public view returns (uint256) {
        return sENCTR.balanceForGons(gonsInWarmup);
    }

    /**
     * @notice seconds until the next epoch begins
     */
    function secondsToNextEpoch() external view returns (uint256) {
        return epoch.end.sub(block.timestamp);
    }

    /* ========== MANAGERIAL FUNCTIONS ========== */

    /**
     * @notice sets the contract address for LP staking
     * @param _distributor address
     */
    function setDistributor(address _distributor) external onlyGovernor {
        distributor = IDistributor(_distributor);
        emit DistributorSet(_distributor);
    }

    /**
     * @notice set warmup period for new stakers
     * @param _warmupPeriod uint
     */
    function setWarmupLength(uint256 _warmupPeriod) external onlyGovernor {
        warmupPeriod = _warmupPeriod;
        emit WarmupSet(_warmupPeriod);
    }
}
