pragma solidity ^0.5.0;


import "../math/BigDiv.sol";

/**
 * @title Used for testing only.
 */
contract BigDivMock
{
  function bigDiv2x1(
    uint256 _numA,
    uint256 _numB,
    uint256 _den
  ) public pure
    returns(uint256)
  {
    return BigDiv.bigDiv2x1(_numA, _numB, _den);
  }

  function bigDiv2x1RoundUp(
    uint256 _numA,
    uint256 _numB,
    uint256 _den
  ) public pure
    returns(uint256)
  {
    return BigDiv.bigDiv2x1RoundUp(_numA, _numB, _den);
  }

  function bigDiv2x2(
    uint256 _numA,
    uint256 _numB,
    uint256 _denA,
    uint256 _denB
  ) public pure
    returns (uint256)
  {
    return BigDiv.bigDiv2x2(_numA, _numB, _denA, _denB);
  }
}
