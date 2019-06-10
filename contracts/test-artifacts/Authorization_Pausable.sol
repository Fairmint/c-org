pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the authorization interface and authorizes everything for everyone.
 */

import "../IAuthorization.sol";
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';

contract Authorization_Pausable is
  IAuthorization
{
  bool public authorized = true;

  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) external
  {
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
    return authorized;
  }

  function availableBalanceOf(
    address _from
  ) external view
    returns (uint256)
  {
    return IERC20(msg.sender).balanceOf(_from);
  }

  function setAuthorized(
    bool _authorized
  ) external
  {
    authorized = _authorized;
  }
}
