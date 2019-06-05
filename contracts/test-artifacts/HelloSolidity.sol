pragma solidity ^0.5.0;

// Test contract
// A trivial contract used to confirm the env configuration

contract HelloSolidity
{
	uint public data;

	constructor() public
	{
		data = 42;
	}

	function setData(uint _data) public
	{
  		data = _data;
  	}
	
	function dataPlus(uint _value) public view returns (uint256)
	{
	    return data + _value;
    }
}
