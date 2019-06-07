pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the TPL interface and authorizes everything for everyone.
 */

import "../ITPLERC20Interface.sol";

contract TPLERC20Interface_FailEveryOther is
  ITPLERC20Interface
{
  bool public authorized;

  function authorizeTransfer(
    address _from,
    address _to,
    uint256 _value
  ) external
  	returns (bool)
  {
  	authorized = !authorized;
	return authorized;
  }

  function authorizeTransferFrom(
    address _sender,
    address _from,
    address _to,
    uint256 _value
  ) external
  	returns (bool)
  {
  	authorized = !authorized;
  	return authorized;
  }
  
  function setAuthorized() external
  {
  	authorized = false;
  }
}
