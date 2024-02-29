// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract LockAndClaim is AccessControl {

    ERC20 public tokenA;
    ERC20 public tokenB;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public ratio1 = 500 * (10 ** 18);
    uint256 public ratio2 = 2000 * (10 ** 18);
    uint256 public dayLevel1 = 10;
    uint256 public dayLevel2 = 20;
    mapping(address => uint256) public lockMap;

    event Lock(uint256 amount);
    event Claim(uint256 amount);
    event DayLevelChanged(uint256 dayLevel1, uint256 dayLevel2);
    event RatiolChanged(uint256 ratio1, uint256 ratio2);
    event TimeChanged(uint256 startTime, uint256 endTime);

    modifier isAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "isAdmin:: Action restricted to admins only"
        );
        _;
    }

    modifier isValidLockTime() {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "isValidLockTime:: Invalid timestamp"
        );
        _;
    }

    modifier isValidClaimTime() {
        require(
            block.timestamp > endTime,
            "isValidClaimTime:: Invalid timestamp"
        );
        _;
    }

    modifier canChangeSettings() {
        require(
            block.timestamp < startTime,
            "canChangeSettings:: Invalid timestamp"
        );
        _;
    }

    constructor(ERC20 _tokenA, ERC20 _tokenB, uint256 _startTime, uint256 _endTime) {
        tokenA = _tokenA;
        tokenB = _tokenB;
        startTime = _startTime;
        endTime = _endTime;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function setStartTimeAndEndTime(uint256 _startTime, uint256 _endTime) external isAdmin canChangeSettings {
        startTime = _startTime;
        endTime = _endTime;
        emit TimeChanged(_startTime, _endTime);
    }

    function setClaimRatio(uint256 _ratio1, uint256 _ratio2) external isAdmin canChangeSettings {
        ratio1 = _ratio1;
        ratio2 = _ratio2;
        emit RatiolChanged(_ratio1, _ratio2);
    }

    function setClaimDayLevel(uint256 _dayLevel1, uint256 _dayLevel2) external isAdmin canChangeSettings {
        dayLevel1 = _dayLevel1;
        dayLevel2 = _dayLevel2;
        emit DayLevelChanged(_dayLevel1, _dayLevel2);
    }

    function lock(uint256 _amount) external isValidLockTime {

        require(_amount > 0, "lock:: amount must not be 0");

        lockMap[msg.sender] += _amount;

        tokenA.transferFrom(msg.sender, address(this), _amount );

        emit Lock(_amount);
    }

    function claim() external isValidClaimTime {

        require(lockMap[msg.sender] > 0, "claim:: No claimable token");

        uint256 totalClaimAmount = _getTotalClaimableToken(msg.sender);

        /* assuming tokenA and tokenB are of the same decimals. If not, need to following conversion

        if( tokenA.decimals() > tokenB.decimals() ){
            totalClaimAmount = totalClaimAmount / (10 ** ( tokenA.decimals() - tokenB.decimals() ) );
        }else {
            totalClaimAmount = totalClaimAmount * (10 ** ( tokenB.decimals() - tokenA.decimals() ) );
        }

        */

        delete lockMap[msg.sender];

        tokenB.transfer(msg.sender, totalClaimAmount );

        emit Claim(totalClaimAmount);

    }

    function getTotalClaimableToken(address _addr) view external returns (uint256) {
        if(lockMap[_addr] == 0 || block.timestamp <= endTime){return 0;}
        return _getTotalClaimableToken(_addr);
    }


    function _getTotalClaimableToken(address _addr) view private returns (uint256) {

        uint256 totalLockAmount = lockMap[_addr];
        uint256 totalClaimAmount;
        uint256 lockDays = ( block.timestamp - endTime ) / 1 days;

        if(totalLockAmount < ratio1){
            totalClaimAmount += totalLockAmount;
        }else if(totalLockAmount >= ratio1 && totalLockAmount < ratio2){
            totalClaimAmount += ( totalLockAmount * 1500 ) / 1000;
        }else{
            totalClaimAmount += ( totalLockAmount * 1750 ) / 1000;
        }

       if(lockDays >= dayLevel1 && lockDays < dayLevel2){
            totalClaimAmount += ( totalLockAmount * 200 ) / 1000;
        }else if (lockDays >= dayLevel2) {
            totalClaimAmount += ( totalLockAmount * 300 ) / 1000;
        }

        return totalClaimAmount;

    }

}
