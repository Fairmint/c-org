pragma solidity ^0.5.0;


import "../math/Sqrt.sol";

/**
 * @title Used for testing only.
 */
contract SqrtMock
{
  function sqrt(
    uint x
  ) public pure
    returns (uint y)
  {
    return Sqrt.sqrt(x);
  }
}
