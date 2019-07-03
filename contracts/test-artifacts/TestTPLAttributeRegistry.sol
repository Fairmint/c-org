pragma solidity ^0.5.0;

import "tpl-contracts/contracts/AttributeRegistryInterface.sol";


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
  
  function setAuthorized(
    bool _authorized
  ) public
  {
    authorized = _authorized;
  }

  function getAttributeValue(
    address,
    uint256
  ) external view returns (uint256)
  {
    return 1; // not used
  }

  function countAttributeTypes() external view returns (uint256)
  {
    return 1; // not used
  }

  function getAttributeTypeID(uint256) external view returns (uint256)
  {
    return 0; // not used
  }
}