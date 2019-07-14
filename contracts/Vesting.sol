pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/drafts/TokenVesting.sol";

// TODO remove using just the imports
contract Vesting is
  TokenVesting
{
  constructor (
    address beneficiary,
    uint256 start,
    uint256 cliffDuration,
    uint256 duration,
    bool revocable
  ) public 
    TokenVesting(beneficiary, start, cliffDuration, duration, revocable)
  {}
}