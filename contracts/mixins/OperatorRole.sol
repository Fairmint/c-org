pragma solidity ^0.5.0;

// Original source: openzeppelin's SignerRole

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";


/**
 * @notice allows a single owner to manage a group of operators which may
 * have some special permissions in the contract.
 */
contract OperatorRole is Initializable, Context, Ownable
{
  using Roles for Roles.Role;

  event OperatorAdded(address indexed account);
  event OperatorRemoved(address indexed account);

  Roles.Role private _operators;

  function _initializeOperatorRole() internal
  {
    _addOperator(msg.sender);
  }

  modifier onlyOperator()
  {
    require(isOperator(msg.sender), "OperatorRole: caller does not have the Operator role");
    _;
  }

  function isOperator(address account) public view returns (bool)
  {
    return _operators.has(account);
  }

  function addOperator(address account) public onlyOwner
  {
    _addOperator(account);
  }

  function removeOperator(address account) public onlyOwner
  {
    _removeOperator(account);
  }

  function renounceOperator() public
  {
    _removeOperator(msg.sender);
  }

  function _addOperator(address account) internal
  {
    _operators.add(account);
    emit OperatorAdded(account);
  }

  function _removeOperator(address account) internal
  {
    _operators.remove(account);
    emit OperatorRemoved(account);
  }

  uint256[50] private ______gap;
}
