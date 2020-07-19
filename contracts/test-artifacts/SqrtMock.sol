pragma solidity ^0.5.0;

import "../math/Sqrt.sol";

/**
 * @title Used for testing only.
 */
contract SqrtMock {
  function sqrt(uint256 x) public pure returns (uint256 y) {
    return Sqrt.sqrt(x);
  }
}
