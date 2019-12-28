pragma solidity ^0.5.0;

import "hardlydifficult-ethereum-contracts/contracts/proxies/CallContract.sol";


contract NoFallbackProxy
{
  using CallContract for address;

  function() external payable
  {
    revert("NO_FALLBACK");
  }

  function proxyCall(
    address _contract,
    bytes memory _callData
  ) public payable
  {
    _contract._call(_callData, msg.value);
  }
}
