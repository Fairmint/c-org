pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the authorization interface and authorizes everything for everyone.
 */

import "IAuthorization.sol";
import "IDAT.sol";
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';

contract Authorization is
  IAuthorization
{
  IDAT public dat;
  uint256 public initLockup;

  struct LockedFSE
  {
    uint256 lockType;
    uint256 expiration;
    uint256 value;
  }
  mapping(address => LockedFSE[]) public lockedTokens;

  constructor(
    address _dat,
    uint256 _initLockup
  ) public
  {
    require(_dat != address(0), "INVALID_ADDRESS");
    dat = IDAT(_dat);
    initLockup = _initLockup;
  }

  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) external
  {
    require(msg.sender == dat, "ONLY_CALL_FROM_DAT");
    require(isTransferAllowed(_operator, _from, _to, _value), "NOT_AUTHORIZED");
  }

  function isTransferAllowed(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) public view
    returns (bool)
  {
    // TODO state > 0 or tokens are from the initReserve
    require(dat.state > 0, "NO_TRANSFER_DURING_INIT");

    return true;
  }

  function availableBalanceOf(
    address _from
  ) external view
    returns (uint256)
  {
    return IERC20(msg.sender).balanceOf(_from);
  }
}
