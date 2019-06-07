pragma solidity ^0.5.0;

interface ITPLInterface {

  /**
   * @notice Check if an account is approved to transfer tokens to account `to` of an amount `value`.
   * @param _from address The account holding the tokens to be sent.
   * @param _to address The account of the recipient. When selling tokens _to will be the ZERO_ADDRESS.
   * @param _value uint256 The amount to transfer.
   */
  function authorizeTransfer(
    address _from,
    address _to,
    uint256 _value
  ) external;

  /**
   * @notice Check if an account is approved to transfer tokens on behalf of account `from` to account `to` of an amount `value`.
   * @param _sender address The account initiating this transfer.
   * @param _from address The account holding the tokens to be sent. When purchasing / minting new tokens _from will be the ZERO_ADDRESS.
   * @param _to address The account of the recipient.
   * @param _value uint256 The amount to transfer.
   */
  function authorizeTransferFrom(
    address _sender,
    address _from,
    address _to,
    uint256 _value
  ) external;
}
