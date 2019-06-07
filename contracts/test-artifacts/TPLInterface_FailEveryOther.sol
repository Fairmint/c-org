pragma solidity ^0.5.0;

/**
 * Test contract
 * Implements the TPL interface and authorizes everything for everyone.
 */

import "../ITPLInterface.sol";

contract TPLInterface_FailEveryOther is
  ITPLInterface
{
  uint256 public counter;

  function authorizeTransfer(
    address _from,
    address _to,
    uint256 _value
  ) external
  {
    require(counter++ % 2 == 0);
  }

  function authorizeTransferFrom(
    address _sender,
    address _from,
    address _to,
    uint256 _value
  ) external
  {
    require(counter++ % 2 == 0);
  }
}
