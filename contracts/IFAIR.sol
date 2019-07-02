pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";


/**
 * @title An interface for the FAIR token.
 * @dev This is not the complete FAIR interface, just what's needed by the other contracts.
 */
contract IFAIR is
  IERC777
{
  /**
   * @notice Returns the owner account which can mint tokens and is an approved operator.
   * @dev The `owner` of the FAIR contract is always the `DAT` contract itself.
   */
  function owner() external view returns (address);
}