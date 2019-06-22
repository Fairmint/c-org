pragma solidity ^0.5.0;

import "./IAuthorization.sol";
import "./IDAT.sol";
import "./IFSE.sol";
import "openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";


contract Authorization is
  IAuthorization
{
  struct LockedFSE
  {
    uint256 lockType;
    uint256 expiration;
    uint256 value;
  }

  address public fse;
  address public dat;
  uint256 public initLockup;
  mapping(address => LockedFSE[]) public lockedTokens; // TODO switch to linked-list

  // TODO switch to init pattern in order to support zos upgrades
  constructor(
    address _fse,
    uint256 _initLockup
  ) public
  {
    require(_fse != address(0), "INVALID_ADDRESS");
    fse = _fse;
    dat = IFSE(_fse).dat();
    initLockup = _initLockup;
  }

  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) public
  {
    require(msg.sender == dat, "ONLY_CALL_VIA_DAT");
    require(isTransferAllowed(_operator, _from, _to, _value), "NOT_AUTHORIZED");
    // TODO if state == 0 and to == beneficiary and from == 0 then freeze for initLockup
    // TODO if state == 0 and from == beneficiary and to != 0 then tranfer freeze as well
  }

  function isTransferAllowed(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) public view
    returns (bool)
  {
    if(_from == address(0))
    { // Mint/Buy
      return true;
    }
    return availableBalanceOf(_from) >= _value;
  }

  function availableBalanceOf(
    address _from
  ) public view
    returns (uint256)
  {
    // TODO upfsee if state==0 && tokens are from the initReserve
    if(IDAT(dat).state() == 0)
    {
      return 0;
    }
    // TODO consider locked tokens
    return IERC777(fse).balanceOf(_from);
  }
}
