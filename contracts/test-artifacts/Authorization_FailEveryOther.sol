pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the authorization interface and authorizes the first request and
 * then fails all other requests until `setAuthorized` is called.
 */

import "../IAuthorization.sol";

contract Authorization_FailEveryOther is
  IAuthorization
{
  bool public authorized;

  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) external
  {
  	authorized = !authorized;
	  require(authorized, "NOT_AUTHORIZED");
  }

  function setAuthorized() external
  {
    authorized = false;
  }
}
