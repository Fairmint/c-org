pragma solidity ^0.5.0;

interface IAuthorization {
  /**
   * @notice Check if an account is approved to transfer tokens to account `to` of an amount `value`.
   * Reverts the transaction if the transfer is not approved.
   * @param _operator address The account initiating this transfer, may be the same as `_from`
   * @param _from address The account holding the tokens to be sent and initiating this transfer.
   * @param _to address The account of the recipient. When selling tokens _to will be the ZERO_ADDRESS.
   * @param _value uint256 The amount to transfer.
   */
  function authorizeTransfer(
    address _operator,
    address _from,
    address _to,
    uint256 _value
  ) external;
}
