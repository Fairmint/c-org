pragma solidity ^0.5.0;

import "./IAuthorization.sol";
import "./IDAT.sol";
import "./IFAIR.sol";
import "./AttributeRegistryInterface.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";


contract Authorization is
  IAuthorization
{
  using SafeMath for uint;

  struct LockedFAIR
  {
    uint value;
    uint previous;
    uint next;
  }

  struct Investor
  {
    uint totalLocked;
    mapping(uint => LockedFAIR) lockedFair;
    uint head;
    uint tail;
  }

  address public fair;
  address public dat;
  address public attributeRegistry;
  mapping(address => Investor) public investors;
  uint[] public attributeTypeIDs;
  mapping(uint => mapping(uint => bool)) public authorizedTransfers;
  mapping(uint => mapping(uint => uint)) public lockupPeriods;

  // TODO switch to init pattern in order to support zos upgrades
  constructor(
    address _fair,
    address _attributeRegistry,
    uint[] memory _attributeTypeIDs,
    uint[] memory _authorizedTransfers,
    uint[] memory _lockupPeriods
  ) public
  {
    require(_fair != address(0), "INVALID_ADDRESS");
    fair = _fair;
    dat = IFAIR(_fair).owner();
    attributeRegistry = _attributeRegistry;
    attributeTypeIDs = _attributeTypeIDs;

    require(_authorizedTransfers.length % 2 == 0, "INVALID_AUTHORIZED_TRANSFERS_COUNT");
    for(uint i = 0; i < _authorizedTransfers.length; i += 2) 
    {
      authorizedTransfers[
        _attributeTypeIDs[_authorizedTransfers[i]]
      ][
        _attributeTypeIDs[_authorizedTransfers[i + 1]]
      ] = true;
    }
    require(_lockupPeriods.length == _attributeTypeIDs.length * 3, "INVALID_LOCKUP_PERIOD_COUNT");
    for(uint i = 0; i < _lockupPeriods.length; i += 3) 
    {
      lockupPeriods[
        _attributeTypeIDs[_lockupPeriods[i]]
      ][
        _attributeTypeIDs[_lockupPeriods[i + 1]]
      ] = _attributeTypeIDs[_lockupPeriods[i + 2]];
    }
  }

  function getInvestorTypeOf(
    address _account
  ) public
    returns (uint)
  {
    for(uint i = 0; i < attributeTypeIDs.length; i++)
    {
      if(AttributeRegistryInterface(attributeRegistry).hasAttribute(_account, attributeTypeIDs[i]))
      {
        return i;
      }
    }

    return uint(-1);
  }

  function getLockupPeriodFor(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _operatorData 
  ) public
    returns (uint)
  {
    if(_to == address(0)) return 0;

    return lockupPeriods[getInvestorTypeOf(_from)][getInvestorTypeOf(_to)];
  }

  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _operatorData
  ) public
  {
    require(msg.sender == fair, "ONLY_CALL_VIA_FAIR");
    unlockTokens(_from, 100); // TODO what is a good depth to use?
    require(isTransferAllowed(_operator, _from, _to, _value, _operatorData), "NOT_AUTHORIZED");
    
    uint lockupPeriod = getLockupPeriodFor(_operator, _from, _to, _value, _operatorData);
    if(lockupPeriod > 0) 
    {
      Investor storage investor = investors[_to];
      uint unlockDate = block.timestamp + lockupPeriod;
      LockedFAIR storage lockedFair = investor.lockedFair[unlockDate];
      investor.totalLocked = investor.totalLocked.add(_value);
      lockedFair.value = lockedFair.value.add(_value);
      if(investor.head == 0)
      {
        // first lock
        investor.head = unlockDate;
        investor.tail = unlockDate;
      } 
      else if(lockedFair.previous == 0 && lockedFair.next == 0)
      { 
        // search where to insert this new entry, starting at end
        lockedFair.previous = investor.tail;
        while(lockedFair.previous > unlockDate)
        {
          /**
           * It's possible this runs out of gas, causing a investor with a large number of purchases to
           * be unable to purchase any more (until after some unlock).
           */ 
          
          lockedFair.previous = investor.lockedFair[lockedFair.previous].previous;
        }
        if(lockedFair.previous == 0)
        {
          lockedFair.next = investor.head;
          investor.head = unlockDate;
        }
        else if(lockedFair.previous == investor.tail)
        {
          investor.lockedFair[investor.tail].next = unlockDate;
          lockedFair.previous = investor.tail;
          investor.tail = unlockDate;
        } 
        else
        {
          LockedFAIR storage previousLockedFair = investor.lockedFair[lockedFair.previous];
          // set our next
          lockedFair.next = previousLockedFair.next;
          // update next's previous
          investor.lockedFair[previousLockedFair.next].previous = unlockDate;
          // update previous's next
          previousLockedFair.next = unlockDate;
        }
      }
    }
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
    returns (uint)
  {
    if(IDAT(dat).state() == 0 && _from != IDAT(dat).beneficiary())
    {
      return 0;
    }

    Investor storage investor = investors[_from];
    uint balance = IERC777(fair).balanceOf(_from).sub(investor.totalLocked);
    uint head = investor.head;
    while (head <= block.timestamp)
    {
      LockedFAIR storage lockedFair = investor.lockedFair[head];
      balance = balance.add(lockedFair.value);
      head = lockedFair.next;
    }
    return balance;
  }

  function unlockTokens(
    address _from,
    uint _maxDepthOr0
  ) public 
  {
    Investor storage investor = investors[_from];
    for(uint i = 0; i < _maxDepthOr0; i++)
    {
      if(investor.head > block.timestamp) return;

      LockedFAIR storage lockedFair = investor.lockedFair[investor.head];
      investor.totalLocked = investor.totalLocked.sub(lockedFair.value);
      investor.head = lockedFair.next;
      delete investor.lockedFair[investor.head];
    }
    investor.lockedFair[investor.head].previous = 0;
  }
}
