pragma solidity ^0.5.0;

interface IAuthorization {
  /**
   * Reverts if the transfer is not approved.
   * @param _operator address The account initiating this transfer, may be the same as `_from`
   * @param _from address The account holding the tokens to be sent and initiating this transfer.
   * @param _to address The account of the recipient. When selling tokens _to will be the ZERO_ADDRESS.
   * @param _amount uint256 The amount to transfer.
   */
  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _amount
  ) external;

  /**
   * @param _operator address The account initiating this transfer, may be the same as `_from`
   * @param _from address The account holding the tokens to be sent and initiating this transfer.
   * @param _to address The account of the recipient. When selling tokens _to will be the ZERO_ADDRESS.
   * @param _amount uint256 The amount to transfer.
   * @return bool true if the transfer is authorized, false if it would revert.
   */
  function isTransferAllowed(
    address _operator,
    address _from,
    address _to,
    uint256 _amount
  ) external view
    returns (bool);

  /**
   * @return uint256 the balance available for a user, this may be less than or
   * equal to their total token balance.
   */
  function availableBalanceOf(
    address _from
  ) external view
    returns (uint256);
}
