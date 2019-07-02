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
  
  function setAuthorized(
    bool _authorized
  ) public
  {
    authorized = _authorized;
  }
}