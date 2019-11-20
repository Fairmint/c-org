pragma solidity ^0.5.0;


import '@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol';

contract Sqrt
{
  using SafeMath for uint;

  /// @notice The max possible value
  uint256 private constant MAX_UINT = 2**256 - 1;

  // Source: https://github.com/ethereum/dapp-bin/pull/50
  function sqrt(
    uint x
  ) public pure
    returns (uint y)
  {
    if (x == 0)
    {
      return 0;
    }
    else if (x <= 3)
    {
      return 1;
    }
    else if (x == MAX_UINT)
    {
      // Without this we fail on x + 1 below
      return 340282366920938463463374607431768211455;
    }

    uint z = (x + 1) / 2;
    y = x;
    while (z < y)
    {
      y = z;
      z = (x / z + z) / 2;
    }
  }
}
