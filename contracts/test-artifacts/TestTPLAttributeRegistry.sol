pragma solidity ^0.5.0;

import "../AttributeRegistryInterface.sol";


contract TestTPLAttributeRegistry
  is AttributeRegistryInterface
{
  bool public authorized = true;

  function hasAttribute(
    address account,
    uint256 attributeTypeID
  ) external view returns (bool)
  {
    return authorized;
  }

  function getAttributeValue(
    address account,
    uint256 attributeTypeID
  ) external view returns (uint256)
  {
    return 1;
  }

  function countAttributeTypes() external view returns (uint256) 
  {
    return 1;
  }

  function getAttributeTypeID(uint256 index) external view returns (uint256) 
  {
    return 1;
  }

  function setAuthorized(
    bool _authorized
  ) public
  {
    authorized = _authorized;
  }
}