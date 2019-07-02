pragma solidity >=0.4.25;


/**
 * @title Attribute Registry interface. EIP-165 ID: 0x5f46473f
 * @notice This is what we use to interface with TPL from `Authorization`.
 * @dev Copied from https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/AttributeRegistryInterface.sol
 * and then simplified and updated to support Solidity 5 (just the `pragma` line changed).
 */
interface AttributeRegistryInterface {
  /**
   * @notice Check if an attribute of the type with ID `attributeTypeID` has
   * been assigned to the account at `account` and is currently valid.
   * @param account address The account to check for a valid attribute.
   * @param attributeTypeID uint256 The ID of the attribute type to check for.
   * @return True if the attribute is assigned and valid, false otherwise.
   * @dev This function MUST return either true or false - i.e. calling this
   * function MUST NOT cause the caller to revert.
   */
  function hasAttribute(
    address account,
    uint256 attributeTypeID
  ) external view returns (bool);
}