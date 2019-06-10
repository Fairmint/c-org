pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the authorization interface and authorizes everything for everyone.
 */

import "../IAuthorization.sol";

contract IAuthorization_AutoApprove is
  IAuthorization
{
  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) external
  {
    // no-op
  }
}
