pragma solidity ^0.5.0;

import "./IAuthorization.sol";
import "./IDAT.sol";
import "./IFAIR.sol";
import "openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";


contract Authorization is
  IAuthorization
{
  struct LockedFAIR
  {
    uint256 lockType;
    uint256 expiration;
    uint256 value;
  }

  address public fair;
  address public dat;
  uint256 public initLockup;
  mapping(address => LockedFAIR[]) public lockedTokens; // TODO switch to linked-list

  // TODO switch to init pattern in order to support zos upgrades
  constructor(
    address _fair,
    uint256 _initLockup
  ) public
  {
    require(_fair != address(0), "INVALID_ADDRESS");
    fair = _fair;
    dat = IFAIR(_fair).owner();
    initLockup = _initLockup;
  }

  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes calldata _operatorData
  ) external
  {
    require(msg.sender == fair, "ONLY_CALL_VIA_FAIR");
    require(isTransferAllowed(_operator, _from, _to, _value, _operatorData), "NOT_AUTHORIZED");
  }

  function isTransferAllowed(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _operatorData
  ) public view
    returns (bool)
  {
    if(_from == address(0))
    { // Mint/Buy
      return true;
    }
    return availableBalanceOf(_from) >= _value;
  }

  function availableBalanceOf(
    address _from
  ) public view
    returns (uint256)
  {
    if(IDAT(dat).state() == 0 && _from != IDAT(dat).beneficiary())
    {
      return 0;
    }
    // TODO consider locked tokens
    return IERC777(fair).balanceOf(_from);
  }
}
