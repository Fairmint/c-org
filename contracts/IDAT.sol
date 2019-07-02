pragma solidity ^0.5.0;

/**
 * @title An interface for the `DAT` contract.
 * @dev This is not the complete DAT interface, just what's needed by the other contracts.
 */
interface IDAT
{
  /**
   * @notice Returns the current beneficiary account for the company.
   */
  function beneficiary() external view returns (address);

  /**
   * @notice Returns the current state of the DAT:
   *  - 0: init
   *  - 1: run
   *  - 2: close
   *  - 3: cancel
   *
   * @dev The DAT itself will ensure state is always one of these 4 values.
   */
  function state() external view returns (uint256);
}
