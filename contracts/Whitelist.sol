pragma solidity 0.5.14;


import "./interfaces/IWhitelist.sol";

/**
 * @title whitelist implementation which manages KYC approvals for the org.
 * @dev modeled after ERC-1404
 */
contract Whitelist is IWhitelist
{
  /**
   * Emits when an operator KYC approves (or revokes) a trader.
   */
  event Approve(address indexed _trader, bool _isApproved);

  mapping(address => bool) public approved;
  address public dat;
  address public owner;

  /**
   * @notice Called once to complete configuration for this contract.
   * @dev Done with `initialize` instead of a constructor in order to support
   * using this contract via an Upgradable Proxy.
   */
  function initialize(
    address _dat
  ) external
  {
    require(owner == address(0), "ALREADY_INITIALIZED");

    dat = _dat;
    owner = msg.sender;

    // Setting 0 to approved allows mint/burn actions
    approved[address(0)] = true;
  }

  function detectTransferRestriction(
    address _from,
    address _to,
    uint //_value (ignored)
  ) public view returns(uint8)
  {
    if(approved[_from] && approved[_to])
    {
      // Transfer approved
      return 0;
    }

    // Transfer denied
    return 1;
  }

  function messageForTransferRestriction(
    uint8 _restrictionCode
  ) external pure
    returns (string memory)
  {
    if(_restrictionCode == 0)
    {
      return "SUCCESS";
    }
    if(_restrictionCode == 1)
    {
      return "DENIED";
    }
    return "UNKNOWN_ERROR";
  }

  /**
   * @notice Allows the owner of this contract to approve (or deny)
   * a trader's account.
   */
  function approve(
    address _trader,
    bool _isApproved
  ) external
  {
    require(msg.sender == owner, "OWNER_ONLY");

    approved[_trader] = _isApproved;
    emit Approve(_trader, _isApproved);
  }

  /**
   * @notice Called by the DAT contract before a transfer occurs.
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
    require(dat == msg.sender, "CALL_VIA_DAT_ONLY");
    require(detectTransferRestriction(_from, _to, _value) == 0, "TRANSFER_DENIED");
    // Future versions will add additional logic here
  }
}
