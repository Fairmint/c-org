pragma solidity ^0.5.0;

import "./IDAT.sol";
import "./IFAIR.sol";
import "tpl-contracts/contracts/AttributeRegistryInterface.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title The `Authorization` contract to approve buy, sell, and transfer transactions.
 * @dev This is consumed by FAIR and DAT contracts directly and may be useful for the frontend/end-users.
 * It interfaces with TPL in order to confirm KYC and to check the investor's status.
 */
contract Authorization
{
//region Types

  using SafeMath for uint;

  /**
   * @notice A linked list of locked tokens, indexed by the time they become available.
   */
  struct LockedFAIR
  {
    /**
     * @notice The number of tokens locked.
     */
    uint lockedValue;

    /**
     * @notice A reference to the next entry in the linked list.
     * @dev This value is also the unlock time for the next entry. `0` if this is the last entry.
     */
    uint nextExpiration;
  }

  /**
   * @notice Tracks the locked tokens for a specific investor.
   */
  struct Investor
  {
    /**
     * @notice How many tokens in total are currently locked.
     * @dev The actual availableBalanceOf may be higher as this includes entries which
     * are ready to unlock (the next time unlockTokens is called).
     * This value must == the sum of entries in `lockedFair`.
     */
    uint totalLocked;

    /**
     * @notice Storage for the linked list of locked tokens for this investor.
     */
    mapping(uint => LockedFAIR) lockedFair;

    /**
     * @notice A reference to the first entry in the linked list.
     * @dev This value is also the unlock time for the first entry. `0` if there are no entries.
     */
    uint firstExpiration;
  }
//endregion

//region Data

  /**
   * @notice The address of the FAIR token contract.
   */
  IFAIR public fair;

  /**
   * @notice The address of the DAT contract for the given FAIR token.
   */
  IDAT public dat;

  /**
   * @notice The address of the TPL Attribute Registry.
   * @dev This is used to determine the investor's status.
   */
  AttributeRegistryInterface public attributeRegistry;

  /**
   * @notice Each investor which has used the system, indexed by address.
   */
  mapping(address => Investor) public investors;

  /**
   * @notice A list of TPL attributeTypeIDs used by `authorizedTransfers` and `lockupPeriods`.
   * @dev The order is significant, applying the first true attribute for the account.
   */
  uint[] public attributeTypeIDs;

  /**
   * @notice A matrix defining if an account type can trade with another account type.
   * @dev The first uint is the index of the applicable attributeTypeID for the `from` account, 
   * the second uint is the index for the `to` account.  `true` means transfer is allowed.
   */
  mapping(uint => mapping(uint => bool)) public authorizedTransfers;

  /**
   * @notice A matrix defining how long tokens should be locked for after a trade based on their account types.
   * @dev The first uint is the index of the applicable attributeTypeID for the `from` account, 
   * the second uint is the index for the `to` account.  The final uint is the length, in seconds, to lock
   * the tokens for after the transfer occurs.
   */
  mapping(uint => mapping(uint => uint)) public lockupPeriods;

//endregion

//region Init

  /**
   * TODO switch to init pattern in order to support zos upgrades
   * Set `fair` and `owner` on init, then move the others to an `updateByOwner` function.
   */ 
  constructor(
    address _fair,
    address _attributeRegistry,
    uint[] memory _attributeTypeIDs,
    uint[] memory _authorizedTransfers,
    uint[] memory _lockupPeriods
  ) public
  {
    require(address(_fair) != address(0), "INVALID_FAIR_ADDRESS");
    fair = IFAIR(_fair);
    dat = IDAT(fair.owner());
    require(address(dat) != address(0), "INVALID_DAT_ADDRESS");

    /**
     * TODO move below to update function
     * ...but what if it's not set yet? I think everything fails and that's okay. Double check.
     * Add comments on the input format.
     */

    require(_attributeRegistry != address(0), "INVALID_REGISTRY_ADDRESS");
    attributeRegistry = AttributeRegistryInterface(_attributeRegistry);
    require(_attributeTypeIDs.length > 0, "MISSING_ATTRIBUTE_TYPES");
    attributeTypeIDs = _attributeTypeIDs;

    require(_authorizedTransfers.length > 0 && _authorizedTransfers.length % 2 == 0, "INVALID_AUTHORIZED_TRANSFERS_COUNT");
    for(uint i = 0; i < _authorizedTransfers.length; i += 2) 
    {
      authorizedTransfers[
        _authorizedTransfers[i]
      ][
        _authorizedTransfers[i + 1]
      ] = true;
    }
    require(_lockupPeriods.length == _attributeTypeIDs.length * 3, "INVALID_LOCKUP_PERIOD_COUNT");
    for(uint i = 0; i < _lockupPeriods.length; i += 3) 
    {
      lockupPeriods[
        _lockupPeriods[i]
      ][
        _lockupPeriods[i + 1]
      ] = _lockupPeriods[i + 2];
    }
  } 

//endregion

//region Read-only

  /**
   * @notice Returns the account type for the given investor.
   * @return uint The index for the first applicable entry from `attributeTypeIDs`. If none are true
   * then MAX_UINT is returned.
   */
  function getInvestorTypeOf(
    address _account
  ) public view
    returns (uint)
  {
    for(uint i = 0; i < attributeTypeIDs.length; i++)
    {
      if(attributeRegistry.hasAttribute(_account, attributeTypeIDs[i]))
      {
        return i;
      }
    }

    // None of the attributes are true for this investor
    return uint(-1);
  }

  /**
   * @notice Checks how long tokens would be locked for after a transfer.
   * @dev If the investorType or lockupPeriod is not found this will return `0`.
   * The params are from the ERC-777 token standard.
   */
  function getLockupPeriodFor(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _userData,
    bytes memory _operatorData 
  ) public view
    returns (uint)
  {
    return lockupPeriods[getInvestorTypeOf(_from)][getInvestorTypeOf(_to)];
  }

  /**
   * @notice Checks if a transfer would succeed.
   * @dev The params are from the ERC-777 token standard.
   */
  function isTransferAllowed(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _userData,
    bytes memory _operatorData
  ) public view
    returns (bool)
  {
    if(!authorizedTransfers[getInvestorTypeOf(_from)][getInvestorTypeOf(_to)]) 
    {
      return false;
    }
    if(_from == address(0))
    { // Mint/Buy
      return true;
    }
    if(_to == address(0))
    { // This is burn or sell
      if(_operator != address(dat))
      { // This is burn
        if(dat.state() != 1)
        { // Burn is only allowed during RUN
          return false;
        }
      }
      else
      { // This is sell
        if(_from == dat.beneficiary() && dat.state() < 2)
        { // The beneficiary may not sell until CLOSE or CANCEL
          return false;
        }
      }
    }
    else
    { // This is a transfer
      if(dat.state() == 0 && _from != dat.beneficiary())
      { // Only beneficiary can make transfers during DAT state `init`
        return false;
      }
    }

    return availableBalanceOf(_from) >= _value;
  }

  /**
   * @notice Returns the balance of unlock / spendable tokens held by the given address.
   */
  function availableBalanceOf(
    address _from
  ) public view
    returns (uint)
  {
    Investor storage investor = investors[_from];
    // Get the current unlocked balance
    uint balance = fair.balanceOf(_from).sub(investor.totalLocked);
    // and add in any locked entries which are ready to be unlocked
    uint head = investor.firstExpiration;
    while (head <= block.timestamp && head != 0)
    {
      LockedFAIR storage lockedFair = investor.lockedFair[head];
      balance = balance.add(lockedFair.lockedValue);
      head = lockedFair.nextExpiration;
    }
    return balance;
  }

//endregion

//region Transactions

  /**
   * @notice Confirms a transfer is authorized and updates storage for the investor as needed.
   * @dev This will call `unlockTokens` and the record the lockup if applicable.
   * The params are from the ERC-777 token standard.
   */
  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes memory _userData,
    bytes memory _operatorData
  ) public
  {
    require(msg.sender == address(fair), "ONLY_CALL_VIA_FAIR");
    unlockTokens(_from, 100); // TODO what is a good depth to use?
    require(isTransferAllowed(_operator, _from, _to, _value, _userData, _operatorData), "NOT_AUTHORIZED");
    
    // Lock tokens after transfer if applicable
    uint lockupPeriod = getLockupPeriodFor(_operator, _from, _to, _value, _userData, _operatorData);
    if(lockupPeriod > 0) 
    {
      Investor storage investor = investors[_to];
      uint unlockDate = block.timestamp.add(lockupPeriod);
      LockedFAIR storage lockedFair = investor.lockedFair[unlockDate];

      // Update the locked value
      investor.totalLocked = investor.totalLocked.add(_value);
      lockedFair.lockedValue = lockedFair.lockedValue.add(_value);

      // Add this lockedFair entry to the linked list if needed
      if(investor.firstExpiration == 0)
      {
        // This is the first / only lock for the investor
        investor.firstExpiration = unlockDate;
      }
      else if(investor.firstExpiration != unlockDate)
      {
        if(investor.firstExpiration > unlockDate)
        {
          // This is a new head for the linked list
          lockedFair.nextExpiration = investor.firstExpiration;
          investor.firstExpiration = unlockDate;
        }
        else if(lockedFair.nextExpiration == 0)
        { 
          // Search where to insert this entry
          lockedFair.nextExpiration = investor.firstExpiration;
          uint previousExpiration = 0;
          while(lockedFair.nextExpiration < unlockDate && lockedFair.nextExpiration != 0)
          {
            /**
            * It's possible this runs out of gas, causing a investor with a large number of purchases to
            * be unable to purchase any more (until after some unlock).
            */ 
            
            previousExpiration = lockedFair.nextExpiration;
            lockedFair.nextExpiration = investor.lockedFair[previousExpiration].nextExpiration;
          }
          if(previousExpiration != 0)
          {
            investor.lockedFair[previousExpiration].nextExpiration = unlockDate;
          }
        }
        // else entry exists, no additional change required
      }
    }
  }

  /**
   * @notice Unlocks any tokens which are ready to be made available.
   * @param _from Anyone can unlock tokens for any account as this is just updating internal state.
   * @param _maxDepth The max number of itterations to attempt, just in case of a potential timeout due to a large backlog.
   */
  function unlockTokens(
    address _from,
    uint _maxDepth
  ) public 
  {
    Investor storage investor = investors[_from];
    for(uint i = 0; i < _maxDepth; i++)
    {
      if(investor.firstExpiration == 0 || investor.firstExpiration > block.timestamp) return;

      LockedFAIR storage lockedFair = investor.lockedFair[investor.firstExpiration];
      investor.totalLocked = investor.totalLocked.sub(lockedFair.lockedValue);
      investor.firstExpiration = lockedFair.nextExpiration;
      delete investor.lockedFair[investor.firstExpiration];
    }
  }

//endregion
}
