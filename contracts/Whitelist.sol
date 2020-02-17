pragma solidity 0.5.16;


import "./interfaces/IWhitelist.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "./mixins/OperatorRole.sol";

/**
 * @notice whitelist which manages KYC approvals, token lockup, and transfer
 * restrictions for a DAT token.
 */
contract Whitelist is IWhitelist, Ownable, OperatorRole
{
  using SafeMath for uint;

  // uint8 status codes as suggested by the ERC-1404 spec
  uint8 constant private STATUS_SUCCESS = 0;
  uint8 constant private STATUS_ERROR_JURISDICTION_FLOW = 1;
  uint8 constant private STATUS_ERROR_LOCKUP = 2;
  uint8 constant private STATUS_ERROR_USER_UNKNOWN = 3;

  event ConfigWhitelist(
    uint _startDate,
    uint _lockupGranularity,
    address indexed _operator
  );
  event UpdateJurisdictionFlow(
    uint indexed _fromJurisdictionId,
    uint indexed _toJurisdictionId,
    uint _lockupLength,
    address indexed _operator
  );
  event ApproveNewUser(
    address indexed _trader,
    uint indexed _jurisdictionId,
    address indexed _operator
  );
  event AddApprovedUserWallet(
    address indexed _userId,
    address indexed _newWallet,
    address indexed _operator
  );
  event RevokeUserWallet(
    address indexed _wallet,
    address indexed _operator
  );
  event UpdateJurisdictionForUserId(
    address indexed _userId,
    uint indexed _jurisdictionId,
    address indexed _operator
  );
  event AddLockup(
    address indexed _userId,
    uint _lockupExpirationDate,
    uint _numberOfTokensLocked,
    address indexed _operator
  );
  event UnlockTokens(
    address indexed _userId,
    uint _tokensUnlocked,
    address indexed _operator
  );

  /**
   * @notice the address of the contract this whitelist manages.
   * @dev this cannot change after initialization
   */
  IERC20 public callingContract;

  /**
   * @notice blocks all new purchases until now >= startDate.
   * @dev this can be changed by the owner at any time
   */
  uint public startDate;

  /**
   * @notice Merges lockup entries when the time delta between
   * them is less than this value.
   * @dev this can be changed by the owner at any time
   */
  uint public lockupGranularity;

  /**
   * @notice Maps the `from` jurisdiction to the `to` jurisdiction to determine if
   * transfers between these entities are allowed and if a token lockup should apply:
   * - 0 means transfers between these jurisdictions is blocked (the default)
   * - 1 is supported with no token lockup required
   * - >1 is supported and this value defines the lockup length in seconds
   * @dev You can read data externally with `getJurisdictionFlow`.
   * This configuration can be modified by the owner at any time
   */
  mapping(uint => mapping(uint => uint)) internal jurisdictionFlows;

  /**
   * @notice Maps a KYC'd user addresses to their userId.
   * @dev The first entry for each user should set userId = user address.
   * Future entries can use the same userId for shared accounts
   * (e.g. a single user with multiple wallets).
   *
   * All wallets with the same userId share the same token lockup.
   */
  mapping(address => address) public authorizedWalletToUserId;

  /**
   * @notice info stored for each userId.
   */
  struct UserInfo
  {
    // The user's current jurisdictionId or 0 for unknown (the default)
    uint jurisdictionId;
    // The number of tokens locked, with details tracked in userIdLockups
    uint totalTokensLocked;
    // The first applicable entry in userIdLockups
    uint startIndex;
    // The last applicable entry in userIdLockups + 1
    uint endIndex;
  }

  /**
   * @notice Maps the userId to UserInfo.
   * @dev You can read data externally with `getAuthorizedUserIdInfo`.
   */
  mapping(address => UserInfo) internal authorizedUserIdInfo;

  /**
   * @notice info stored for each token lockup.
   */
  struct Lockup
  {
    // The date/time that this lockup entry has expired and the tokens may be transferred
    uint lockupExpirationDate;
    // How many tokens locked until the given expiration date.
    uint numberOfTokensLocked;
  }

  /**
   * @notice Maps the userId -> lockup entry index -> a Lockup entry
   * @dev Indexes are tracked by the UserInfo entries.
   * You can read data externally with `getUserIdLockup`.
   * We assume lockups are always added in order of expiration date -
   * if that assumption does not hold, some tokens may remain locked
   * until older lockup entries from that user have expired.
   */
  mapping(address => mapping(uint => Lockup)) internal userIdLockups;

  /**
   * @notice checks for transfer restrictions between jurisdictions.
   * @return if transfers between these jurisdictions are allowed and if a
   * token lockup should apply:
   * - 0 means transfers between these jurisdictions is blocked (the default)
   * - 1 is supported with no token lockup required
   * - >1 is supported and this value defines the lockup length in seconds
   */
  function getJurisdictionFlow(
    uint _fromJurisdictionId,
    uint _toJurisdictionId
  ) external view
    returns (uint lockupLength)
  {
    return jurisdictionFlows[_fromJurisdictionId][_toJurisdictionId];
  }

  /**
   * @notice checks details for a given userId.
   */
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

  /**
   * @notice gets a specific lockup entry for a userId.
   * @dev use `getAuthorizedUserIdInfo` to determine the range of applicable lockupIndex.
   */
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
   * @notice Returns the number of unlocked tokens a given userId has available.
   * @dev this is a `view`-only way to determine how many tokens are still locked
   * (info.totalTokensLocked is only accurate after processing lockups which changes state)
   */
  function getLockedTokenCount(
    address _userId
  ) external view
    returns (uint lockedTokens)
  {
    UserInfo memory info = authorizedUserIdInfo[_userId];
    lockedTokens = info.totalTokensLocked;
    uint endIndex = info.endIndex;
    for(uint i = info.startIndex; i < endIndex; i++)
    {
      Lockup memory lockup = userIdLockups[_userId][i];
      if(lockup.lockupExpirationDate > now)
      {
        // no more eligible entries
        break;
      }
      // this lockup entry has expired and would be processed on the next tx
      lockedTokens -= lockup.numberOfTokensLocked;
    }
  }

  /**
   * @notice Checks if there is a transfer restriction for the given addresses.
   * Does not consider tokenLockup. Use `getLockedTokenCount` for that.
   * @dev this function is from the erc-1404 standard and currently in use by the DAT
   * for the `pay` feature.
   */
  function detectTransferRestriction(
    address _from,
    address _to,
    uint /* _value */
  ) external view
    returns(uint8 status)
  {
    address fromUserId = authorizedWalletToUserId[_from];
    address toUserId = authorizedWalletToUserId[_to];
    if(
      (fromUserId == address(0) && _from != address(0)) ||
      (toUserId == address(0) && _to != address(0))
    )
    {
      return STATUS_ERROR_USER_UNKNOWN;
    }
    if(fromUserId != toUserId)
    {
      uint fromJurisdictionId = authorizedUserIdInfo[fromUserId].jurisdictionId;
      uint toJurisdictionId = authorizedUserIdInfo[toUserId].jurisdictionId;
      if(jurisdictionFlows[fromJurisdictionId][toJurisdictionId] == 0)
      {
        return STATUS_ERROR_JURISDICTION_FLOW;
      }
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
    if(_restrictionCode == STATUS_ERROR_USER_UNKNOWN)
    {
      return "DENIED: USER_UNKNOWN";
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
   * @notice Called by the owner to define or update jurisdiction flows.
   * @param _lockupLengths defines transfer restrictions where:
   * - 0 is not supported (the default)
   * - 1 is supported with no token lockup required
   * - >1 is supported and this value defines the lockup length in seconds.
   * @dev note that this can be called with a partial list, only including entries
   * to be added or which have changed.
   */
  function updateJurisdictionFlows(
    uint[] calldata _fromJurisdictionIds,
    uint[] calldata _toJurisdictionIds,
    uint[] calldata _lockupLengths
  ) external
    onlyOwner()
  {
    uint count = _fromJurisdictionIds.length;
    for(uint i = 0; i < count; i++)
    {
      uint fromJurisdictionId = _fromJurisdictionIds[i];
      uint toJurisdictionId = _toJurisdictionIds[i];
      require(fromJurisdictionId > 0 && toJurisdictionId > 0, "INVALID_JURISDICTION_ID");
      jurisdictionFlows[fromJurisdictionId][toJurisdictionId] = _lockupLengths[i];
      emit UpdateJurisdictionFlow(
        fromJurisdictionId,
        toJurisdictionId,
        _lockupLengths[i],
        msg.sender
      );
    }
  }

  /**
   * @notice Called by an operator to add new traders.
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
      require(authorizedWalletToUserId[trader] == address(0), "USER_WALLET_ALREADY_ADDED");
      require(authorizedUserIdInfo[trader].jurisdictionId == 0, "USER_ID_ALREADY_ADDED");
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
      address userId = _userIds[i];
      require(authorizedUserIdInfo[userId].jurisdictionId != 0, "USER_ID_UNKNOWN");
      address newWallet = _newWallets[i];
      require(authorizedWalletToUserId[newWallet] == address(0), "WALLET_ALREADY_ADDED");

      authorizedWalletToUserId[newWallet] = userId;
      emit AddApprovedUserWallet(userId, newWallet, msg.sender);
    }
  }

  /**
   * @notice Called by an operator to revoke approval for the given wallets.
   * @dev If this is called in error, you can restore access with `addApprovedUserWallets`.
   */
  function revokeUserWallets(
    address[] calldata _wallets
  ) external
    onlyOperator()
  {
    uint length = _wallets.length;
    for(uint i = 0; i < length; i++)
    {
      address wallet = _wallets[i];
      require(authorizedWalletToUserId[wallet] != address(0), "WALLET_NOT_FOUND");

      authorizedWalletToUserId[wallet] = address(0);
      emit RevokeUserWallet(wallet, msg.sender);
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

  /**
   * @notice Adds a tokenLockup for the userId.
   * @dev A no-op if lockup is not required for this transfer.
   * The lockup entry is merged with the most recent lockup for that user
   * if the expiration date is <= `lockupGranularity` from the previous entry.
   */
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

  /**
   * @notice Checks the next lockup entry for a given user and unlocks
   * those tokens if applicable.
   * @param _ignoreExpiration bypasses the recorded expiration date and
   * removes the lockup entry if there are any remaining for this user.
   */
  function _processLockup(
    UserInfo storage info,
    address _userId,
    bool _ignoreExpiration
  ) internal
    returns (bool isDone)
  {
    if(info.startIndex >= info.endIndex)
    {
      // no lockups for this user
      return true;
    }
    Lockup storage lockup = userIdLockups[_userId][info.startIndex];
    if(lockup.lockupExpirationDate > now && !_ignoreExpiration)
    {
      // no more eligable entries
      return true;
    }
    emit UnlockTokens(_userId, lockup.numberOfTokensLocked, msg.sender);
    info.totalTokensLocked -= lockup.numberOfTokensLocked;
    info.startIndex++;
    // Free up space we don't need anymore
    lockup.numberOfTokensLocked = 0;
    lockup.lockupExpirationDate = 0;
    // There may be another entry
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
    require(info.jurisdictionId > 0, "USER_ID_UNKNOWN");
    for(uint i = 0; i < _maxCount; i++)
    {
      if(_processLockup(info, _userId, false))
      {
        break;
      }
    }
  }

  /**
   * @notice Allows operators to remove lockup entries, bypassing the
   * recorded expiration date.
   * @dev This should generally remain unused. It could be used in combination with
   * `addLockups` to fix an incorrect lockup expiration date or quantity.
   */
  function forceUnlock(
    address _userId,
    uint _maxCount
  ) external
    onlyOperator()
  {
    UserInfo storage info = authorizedUserIdInfo[_userId];
    require(info.jurisdictionId > 0, "USER_ID_UNKNOWN");
    for(uint i = 0; i < _maxCount; i++)
    {
      if(_processLockup(info, _userId, true))
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
    require(fromUserId != address(0) || _from == address(0), "FROM_USER_UNKNOWN");
    address toUserId = authorizedWalletToUserId[_to];
    require(toUserId != address(0) || _to == address(0), "TO_USER_UNKNOWN");

    // A single user can move funds between wallets they control without restriction
    if(fromUserId != toUserId)
    {
      uint fromJurisdictionId = authorizedUserIdInfo[fromUserId].jurisdictionId;
      uint toJurisdictionId = authorizedUserIdInfo[toUserId].jurisdictionId;
      uint lockupLength = jurisdictionFlows[fromJurisdictionId][toJurisdictionId];
      require(lockupLength > 0, "DENIED: JURISDICTION_FLOW");

      // If the lockupLength is 1 then we interpret this as approved without any lockup
      // This means any token lockup period must be at least 2 seconds long in order to apply.
      if(lockupLength > 1 && _to != address(0))
      {
        // Lockup may apply for any action other than burn/sell (e.g. buy/pay/transfer)
        uint lockupExpirationDate = now + lockupLength;
        _addLockup(toUserId, lockupExpirationDate, _value);
      }

      if(_from == address(0))
      {
        // This is minting (buy or pay)
        require(now >= startDate, "WAIT_FOR_START_DATE");
      }
      else
      {
        // This is a transfer (or sell)
        UserInfo storage info = authorizedUserIdInfo[fromUserId];
        while(true)
        {
          if(_processLockup(info, fromUserId, false))
          {
            break;
          }
        }
        uint balance = callingContract.balanceOf(_from);
        // This first require is redundant, but allows us to provide
        // a more clear error message.
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
}
