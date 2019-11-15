pragma solidity ^0.5.0;

import "hardlydifficult-ethereum-contracts/contracts/proxies/CallContract.sol";


contract NoFallbackProxy is CallContract
{
  function() external payable
  {
    revert("NO_FALLBACK");
  }

  function proxyCall(
    address _contract,
    bytes memory _callData
  ) public payable
  {
    _call(_contract, msg.value, _callData);
  }
}
