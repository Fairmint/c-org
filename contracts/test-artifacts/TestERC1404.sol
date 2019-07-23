pragma solidity ^0.5.0;


contract TestERC1404
{
  uint8 public restriction;

  function detectTransferRestriction(
    address _from,
    address _to, 
    uint256 _value
  ) public view
    returns(uint8)
  {
    return restriction;
  }

  function messageForTransferRestriction(
    uint8 _restrictionCode
  ) public view 
    returns(string memory)
  {
    if(_restrictionCode == 0)
    {
      return "SUCCESS";
    }
    else if(_restrictionCode == 1)
    {
      return "DENIED";
    }
    return "UNKNOWN_ERROR";
  }

  function updateRestriction(
    uint8 _restriction
  ) public
  {
    restriction = _restriction;
  }
}