# Test contract
# Implements the TPL interface and authorizes everything for everyone.
# From https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/examples/token/ERC20/TPLERC20PermissionedInterface.sol

@public
@constant
def canTransfer(_to: address, _value: uint256) -> bool:
  """
  @notice Check if an account is approved to transfer tokens to account `to` of an amount `value`.
  @param to address The account of the recipient.
  @param value uint256 The amount to transfer.
  @return Bool indicating if transfer will succeed & byte with a status code.
  """
  return True

@public
@constant
def canTransferFrom(_from: address, _to: address, _value: uint256) -> bool:
  """
  @notice Check if an account is approved to transfer tokens on behalf of account `from` to account `to` of an amount `value`.
  @param from address The account holding the tokens to be sent. When purchasing / minting new tokens _from will be the ZERO_ADDRESS.
  @param to address The account of the recipient.
  @param value uint256 The amount to transfer.
  @return Bool indicating if transfer will succeed & byte with a status code.
  """
  return True
