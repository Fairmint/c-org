pragma solidity ^0.5.0;

import "../math/BigDiv.sol";

/**
 * @title Used for testing only.
 */
contract BigDivMock {
  function bigDiv2x1(
    uint _numA,
    uint _numB,
    uint _den
  ) public pure returns (uint) {
    return BigDiv.bigDiv2x1(_numA, _numB, _den);
  }

  function bigDiv2x1RoundUp(
    uint _numA,
    uint _numB,
    uint _den
  ) public pure returns (uint) {
    return BigDiv.bigDiv2x1RoundUp(_numA, _numB, _den);
  }

  function bigDiv2x2(
    uint _numA,
    uint _numB,
    uint _denA,
    uint _denB
  ) public pure returns (uint) {
    return BigDiv.bigDiv2x2(_numA, _numB, _denA, _denB);
  }
}
