pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the TPL interface and authorizes everything for everyone.
 */

import "../ITPLInterface.sol";

contract TPLInterface_AutoApprove is
  ITPLInterface
{
  function authorizeTransfer(
    address _from,
    address _to,
    uint256 _value
  ) external
  {
    // no-op
  }

  function authorizeTransferFrom(
    address _sender,
    address _from,
    address _to,
    uint256 _value
  ) external
  {
    // no-op
  }
}
