pragma solidity 0.5.16;


import "./interfaces/IWhitelist.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "./mixins/OperatorRole.sol";

/**
 * @title whitelist implementation which manages KYC approvals for the org.
 * @dev modeled after ERC-1404
 */
contract Whitelist is IWhitelist, Ownable, OperatorRole
{
  using SafeMath for uint;

  uint8 constant private STATUS_SUCCESS = 0;
  uint8 constant private STATUS_ERROR_JURISDICTION_FLOW = 1;
  uint8 constant private STATUS_ERROR_LOCKUP = 2;

  event ConfigWhitelist(
    uint _startDate,
    uint _lockupGranularity,
    address _operator
  );
  event UpdateLockupLength(
    uint _jurisdictionId,
    uint _lockupLength,
    address _operator
  );
  event UpdateJurisdictionFlow(
    uint _fromJurisdictionId,
    uint _toJurisdictionId,
    bool _accepted,
    address _operator
  );
  event ApproveNewUser(
    address _trader,
    uint _jurisdictionId,
    address _operator
  );
  event AddApprovedUser(
    address _userId,
    address _newWallet,
    address _operator
  );
  event UpdateJurisdictionForUserId(
    address _userId,
    uint _jurisdictionId,
    address _operator
  );
  event AddLockup(
    address _userId,
    uint _lockupExpirationDate,
    uint _numberOfTokensLocked,
    address _operator
  );
  event UnlockedTokens(
    address _userId,
    uint _tokensUnlocked,
    address _operator
  );

  /**
   * @notice the address of the contract this whitelist manages.
   */
  IERC20 public callingContract;

  /**
   * @notice blocks all new purchases until now >= startDate.
   */
  uint public startDate;

  /**
   * @notice Merges lockup entries when the time delta between
   * them is less than this value.
   */
  uint public lockupGranularity;

  /**
   * @notice Maps the jurisdiction id to lockup in seconds.
   */
  mapping(uint => uint) public lockupLength;

  /**
   * @notice Maps the from jurisdiction to the to jurisdiction to determine if
   * transfers between these entities are allowed.
   * @dev You can read data externally with `getJurisdictionFlow`
   */
  mapping(uint => mapping(uint => bool)) internal jurisdictionFlows;

  /**
   * @notice Maps KYC'd user addresses to their userId.
   * @dev The first entry for each user should set userId = user address.
   * Future entries can use the same userId for shared accounts
   * (e.g. I have multiple wallets or we support multiple DEX's).
   */
  mapping(address => address) public authorizedWalletToUserId;

  struct UserInfo
  {
    uint jurisdictionId;
    uint totalTokensLocked;
    uint startIndex;
    uint endIndex;
  }

  /**
   * @notice Maps the userId to UserInfo.
   * @dev You can read data externally with `getAuthorizedUserIdInfo`.
   */
  mapping(address => UserInfo) internal authorizedUserIdInfo;

  struct Lockup
  {
    uint lockupExpirationDate;
    uint numberOfTokensLocked;
  }

  /**
   * @notice Maps the userId to lockup entry index to Lockup
   * @dev Indexes are tracked by the UserInfo entries.
   * You can read data externally with `getUserIdLockup`.
   */
  mapping(address => mapping(uint => Lockup)) internal userIdLockups;

  function getJurisdictionFlow(
    uint _fromJurisdictionId,
    uint _toJurisdictionId
  ) external view
    returns (bool)
  {
    return jurisdictionFlows[_fromJurisdictionId][_toJurisdictionId];
  }

  function getAuthorizedUserIdInfo(
    address _userId
  ) external view
    returns (
      uint jurisdictionId,
      uint totalTokensLocked,
      uint startIndex,
      uint endIndex
    )
  {
    UserInfo memory info = authorizedUserIdInfo[_userId];
    return (info.jurisdictionId, info.totalTokensLocked, info.startIndex, info.endIndex);
  }

  function getUserIdLockup(
    address _userId,
    uint _lockupIndex
  ) external view
    returns (uint lockupExpirationDate, uint numberOfTokensLocked)
  {
    Lockup memory lockup = userIdLockups[_userId][_lockupIndex];
    return (lockup.lockupExpirationDate, lockup.numberOfTokensLocked);
  }

  /**
   * @notice Returns the number of unlocked tokens
   * a given userId has available.
   */
  function getLockedTokenCount(
    address _userId
  ) external view
    returns (uint lockedTokens)
  {
    UserInfo memory info = authorizedUserIdInfo[_userId];
    lockedTokens = info.totalTokensLocked;
    uint index = info.startIndex;
    while(true)
    {
      if(info.startIndex >= info.endIndex)
      {
        // no more entries for this userId
        break;
      }
      Lockup memory lockup = userIdLockups[_userId][index];
      if(lockup.lockupExpirationDate > now)
      {
        // no more eligable entries
        break;
      }
      lockedTokens -= lockup.numberOfTokensLocked;
      index++;
    }
  }

  /**
   * @notice Checks if there is a transfer restriction for the given addresses.
   * Does not consider tokenLockup. Use `getLockedTokenCount` for that.
   */
  function detectTransferRestriction(
    address _from,
    address _to,
    uint /* _value */
  ) external view
    returns(uint8)
  {
    address fromUserId = authorizedWalletToUserId[_from];
    uint fromJurisdictionId = authorizedUserIdInfo[fromUserId].jurisdictionId;
    address toUserId = authorizedWalletToUserId[_to];
    uint toJurisdictionId = authorizedUserIdInfo[toUserId].jurisdictionId;
    if(!jurisdictionFlows[fromJurisdictionId][toJurisdictionId])
    {
      return STATUS_ERROR_JURISDICTION_FLOW;
    }

    return STATUS_SUCCESS;
  }

  function messageForTransferRestriction(
    uint8 _restrictionCode
  ) external pure
    returns (string memory)
  {
    if(_restrictionCode == STATUS_SUCCESS)
    {
      return "SUCCESS";
    }
    if(_restrictionCode == STATUS_ERROR_JURISDICTION_FLOW)
    {
      return "DENIED: JURISDICTION_FLOW";
    }
    if(_restrictionCode == STATUS_ERROR_LOCKUP)
    {
      return "DENIED: LOCKUP";
    }
    return "DENIED: UNKNOWN_ERROR";
  }

  /**
   * @notice Called once to complete configuration for this contract.
   * @dev Done with `initialize` instead of a constructor in order to support
   * using this contract via an Upgradable Proxy.
   */
  function initialize(
    address _callingContract
  ) public
  {
    Ownable.initialize(msg.sender);
    _initializeOperatorRole();
    callingContract = IERC20(_callingContract);
  }

  /**
   * @notice Called by the owner to update the startDate or lockupGranularity.
   */
  function configWhitelist(
    uint _startDate,
    uint _lockupGranularity
  ) external
    onlyOwner()
  {
    startDate = _startDate;
    lockupGranularity = _lockupGranularity;
    emit ConfigWhitelist(_startDate, _lockupGranularity, msg.sender);
  }

  /**
   * @notice Called by the owner to define or update the lockup length
   * for the given jurisdictions.
   */
  function updateLockupLengths(
    uint[] calldata _jurisdictionIds,
    uint[] calldata _lockupLengths
  ) external
    onlyOwner()
  {
    uint count = _jurisdictionIds.length;
    for(uint i = 0; i < count; i++)
    {
      uint length = _lockupLengths[i];
      require(length < 2 ** 128 - 1, "EXCESSIVE_LENGTH");
      lockupLength[_jurisdictionIds[i]] = length;
      emit UpdateLockupLength(_jurisdictionIds[i], length, msg.sender);
    }
  }

  /**
   * @notice Called by the owner to define or update jurisdiction flows.
   */
  function updateJurisdictionFlows(
    uint[] calldata _fromJurisdictionIds,
    uint[] calldata _toJurisdictionIds,
    bool[] calldata _accepted
  ) external
    onlyOwner()
  {
    uint count = _fromJurisdictionIds.length;
    for(uint i = 0; i < count; i++)
    {
      jurisdictionFlows[_fromJurisdictionIds[i]][_toJurisdictionIds[i]] = _accepted[i];
      emit UpdateJurisdictionFlow(
        _fromJurisdictionIds[i],
        _toJurisdictionIds[i],
        _accepted[i],
        msg.sender
      );
    }
  }

  /**
   * @notice Called by an operator to add a new trader.
   * @dev The trader will be assigned a userId equal to their wallet address.
   */
  function approveNewUsers(
    address[] calldata _traders,
    uint[] calldata _jurisdictionIds
  ) external
    onlyOperator()
  {
    uint length = _traders.length;
    for(uint i = 0; i < length; i++)
    {
      address trader = _traders[i];
      require(authorizedWalletToUserId[trader] == address(0), "USER_ALREADY_ADDED");
      uint jurisdictionId = _jurisdictionIds[i];
      require(jurisdictionId != 0, "INVALID_JURISDICTION_ID");

      authorizedWalletToUserId[trader] = trader;
      authorizedUserIdInfo[trader].jurisdictionId = jurisdictionId;
      emit ApproveNewUser(trader, jurisdictionId, msg.sender);
    }
  }

  /**
   * @notice Called by an operator to add wallets to known userIds.
   */
  function addApprovedUserWallets(
    address[] calldata _userIds,
    address[] calldata _newWallets
  ) external
    onlyOperator()
  {
    uint length = _userIds.length;
    for(uint i = 0; i < length; i++)
    {
      address newWallet = _newWallets[i];
      require(authorizedWalletToUserId[newWallet] == address(0), "WALLET_ALREADY_ADDED");
      address userId = _userIds[i];
      require(authorizedUserIdInfo[userId].jurisdictionId != 0, "USER_ID_UNKNOWN");

      authorizedWalletToUserId[newWallet] = userId;
      emit AddApprovedUser(userId, newWallet, msg.sender);
    }
  }

  /**
   * @notice Called by an operator to change the jurisdiction
   * for the given userIds.
   */
  function updateJurisdictionsForUserIds(
    address[] calldata _userIds,
    uint[] calldata _jurisdictionIds
  ) external
    onlyOperator()
  {
    uint length = _userIds.length;
    for(uint i = 0; i < length; i++)
    {
      address userId = _userIds[i];
      require(authorizedUserIdInfo[userId].jurisdictionId != 0, "USER_ID_UNKNOWN");
      uint jurisdictionId = _jurisdictionIds[i];
      require(jurisdictionId != 0, "INVALID_JURISDICTION_ID");

      authorizedUserIdInfo[userId].jurisdictionId = jurisdictionId;
      emit UpdateJurisdictionForUserId(userId, jurisdictionId, msg.sender);
    }
  }

  function _addLockup(
    address _userId,
    uint _lockupExpirationDate,
    uint _numberOfTokensLocked
  ) internal
  {
    if(_numberOfTokensLocked == 0 || _lockupExpirationDate <= now)
    {
      // This is a no-op
      return;
    }
    emit AddLockup(_userId, _lockupExpirationDate, _numberOfTokensLocked, msg.sender);
    UserInfo storage info = authorizedUserIdInfo[_userId];
    require(info.jurisdictionId != 0, "USER_ID_UNKNOWN");
    info.totalTokensLocked = info.totalTokensLocked.add(_numberOfTokensLocked);
    if(info.endIndex > 0)
    {
      Lockup storage lockup = userIdLockups[_userId][info.endIndex - 1];
      if(lockup.lockupExpirationDate + lockupGranularity >= _lockupExpirationDate)
      {
        // Merge with the previous entry
        // if totalTokensLocked can't overflow then this value will not either
        lockup.numberOfTokensLocked += _numberOfTokensLocked;
        return;
      }
    }
    // Add a new lockup entry
    userIdLockups[_userId][info.endIndex] = Lockup(_lockupExpirationDate, _numberOfTokensLocked);
    info.endIndex++;
  }

  /**
   * @notice Operators can manually add lockups for userIds.
   * This may be used by the organization before transfering tokens
   * from the initial supply.
   */
  function addLockups(
    address[] calldata _userIds,
    uint[] calldata _lockupExpirationDates,
    uint[] calldata _numberOfTokensLocked
  ) external
    onlyOperator()
  {
    uint length = _userIds.length;
    for(uint i = 0; i < length; i++)
    {
      _addLockup(
        _userIds[i],
        _lockupExpirationDates[i],
        _numberOfTokensLocked[i]
      );
    }
  }

  function _processLockup(
    UserInfo storage info,
    address _userId
  ) internal
    returns (bool isDone)
  {
    if(info.startIndex >= info.endIndex)
    {
      // no lockups for this user
      return true;
    }
    Lockup storage lockup = userIdLockups[_userId][info.startIndex];
    if(lockup.lockupExpirationDate > now)
    {
      // no more eligable entries
      return true;
    }
    emit UnlockedTokens(_userId, lockup.numberOfTokensLocked, msg.sender);
    info.totalTokensLocked -= lockup.numberOfTokensLocked;
    info.startIndex++;
    // Free up space we don't need anymore
    lockup.numberOfTokensLocked = 0;
    lockup.lockupExpirationDate = 0;
    return false;
  }

  /**
   * @notice Anyone can process lockups for a userId.
   * This is generally unused but may be required if a given userId
   * has a lot of individual lockup entries which are expired.
   */
  function processLockups(
    address _userId,
    uint _maxCount
  ) external
  {
    UserInfo storage info = authorizedUserIdInfo[_userId];
    for(uint i = 0; i < _maxCount; i++)
    {
      if(_processLockup(info, _userId))
      {
        break;
      }
    }
  }

  /**
   * @notice Called by the callingContract before a transfer occurs.
   * @dev This call will revert when the transfer is not authorized.
   * This is a mutable call to allow additional data to be recorded,
   * such as when the user aquired their tokens.
   */
  function authorizeTransfer(
    address _from,
    address _to,
    uint _value,
    bool _isSell
  ) external
  {
    require(address(callingContract) == msg.sender, "CALL_VIA_CONTRACT_ONLY");

    if(_to == address(0) && !_isSell)
    {
      // This is a burn, no authorization required
      // You can burn locked tokens. Burning will effectively burn unlocked tokens,
      // and then burn locked tokens starting with those that will be unlocked first.
      return;
    }

    address fromUserId = authorizedWalletToUserId[_from];
    uint fromJurisdictionId = authorizedUserIdInfo[fromUserId].jurisdictionId;
    address toUserId = authorizedWalletToUserId[_to];
    uint toJurisdictionId = authorizedUserIdInfo[toUserId].jurisdictionId;
    require(jurisdictionFlows[fromJurisdictionId][toJurisdictionId], "DENIED: JURISDICTION_FLOW");

    if(_from == address(0))
    {
      // This is minting (buy or pay)
      require(now >= startDate, "WAIT_FOR_START_DATE");
      uint lockupExpirationDate = now + lockupLength[toJurisdictionId];
      _addLockup(toUserId, lockupExpirationDate, _value);
    }
    else
    {
      // This is a transfer (or sell)
      UserInfo storage info = authorizedUserIdInfo[fromUserId];
      while(true)
      {
        if(_processLockup(info, fromUserId))
        {
          break;
        }
      }
      uint balance = callingContract.balanceOf(_from);
      require(
        balance >= _value,
        "INSUFFICIENT_BALANCE"
      );
      require(
        balance >= info.totalTokensLocked.add(_value),
        "INSUFFICIENT_TRANSFERABLE_BALANCE"
      );
    }
  }
}
