pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the authorization interface and authorizes everything for everyone.
 */

import "../Authorization.sol";

contract Authorization_Pausable is
  Authorization
{
  bool public authorized = true;

  constructor(
    address _dat
  ) public
    Authorization(_dat, 0)
  {}

  function isTransferAllowed(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _operatorData
  ) public view
    returns (bool)
  {
    if(authorized)
    {
      return super.isTransferAllowed(_operator, _from, _to, _value, _operatorData);
    }
    return false;
  }

  function availableBalanceOf(
    address _from
  ) public view
    returns (uint256)
  {
    if(authorized)
    {
      return super.availableBalanceOf(_from);
    }
    else
    {
      return 0;
    }
  }

  function setAuthorized(
    bool _authorized
  ) public
  {
    authorized = _authorized;
  }
}
