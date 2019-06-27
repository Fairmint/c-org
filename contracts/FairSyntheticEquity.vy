# Fair Synthetic Equity (FSE)
# ERC-777 and ERC-20 compliance token
# Allows the owner to mint tokens and uses IAuthorization to validate transfers

#region Types
##################################################

from vyper.interfaces import ERC20

# TODO: switch to interface files (currently non-native imports fail to compile)
# Depends on https://github.com/ethereum/vyper/issues/1367
contract IAuthorization:
  def authorizeTransfer( # TODO how to burn vs sell?
    _operator: address,
    _from: address,
    _to: address,
    _value: uint256,
    _operatorData: bytes[256]
  ): modifying
  def availableBalanceOf(
    _from: address
  ) -> uint256: constant
contract IERC1820Registry:
  def setInterfaceImplementer(
    _account: address,
    _interfaceHash: bytes32,
    _implementer: address
  ): modifying
  def getInterfaceImplementer(
    _addr: address,
    _interfaceHash: bytes32
  ) -> address: constant
contract IERC777Recipient:
  def tokensReceived(
    _operator: address,
    _from: address,
    _to: address,
    _amount: uint256,
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying
contract IERC777Sender:
  def tokensToSend(
    _operator: address,
    _from: address,
    _to: address,
    _amount: uint256,
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying

implements: ERC20

# Events required by the ERC-20 token standard
Approval: event({
  _owner: indexed(address),
  _spender: indexed(address),
  _value: uint256
})
Transfer: event({
  _from: indexed(address),
  _to: indexed(address),
  _value: uint256
})

# Events required by the ERC-777 token standard
AuthorizedOperator: event({
  _operator: indexed(address),
  _tokenHolder: indexed(address)
})
Burned: event({
  _operator: indexed(address),
  _from: indexed(address),
  _amount: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
})
Minted: event({
  _operator: indexed(address),
  _to: indexed(address),
  _amount: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
})
RevokedOperator: event({
  _operator: indexed(address),
  _tokenHolder: indexed(address)
})
Sent: event({
  _operator: indexed(address),
  _from: indexed(address),
  _to: indexed(address),
  _amount: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
})

# Events triggered when updating the tokens's configuration
UpdateConfig: event({
  _authorizationAddress: address,
  _name: string[64],
  _symbol: string[32]
})

#endregion

#region Data
##################################################

# Constants
# TODO test gas of using hex directly (this is not cached in Solidity)
TOKENS_SENDER_INTERFACE_HASH: constant(bytes32) = keccak256("ERC777TokensSender")
TOKENS_RECIPIENT_INTERFACE_HASH: constant(bytes32) = keccak256("ERC777TokensRecipient")
ERC1820Registry: IERC1820Registry # not public: constant data

# Data specific to our business logic
authorizationAddress: public(address)
authorization: IAuthorization # redundant w/ authorizationAddress, for convenience
burnedSupply: public(uint256)
owner: public(address)

# Data storage required by the ERC-20 token standard
allowances: map(address, map(address, uint256)) # not public: exposed via `allowance`
balanceOf: public(map(address, uint256))
# @notice Returns the account balance of another account with address _owner.

totalSupply: public(uint256)

# Metadata suggested by the ERC-20 token standard
name: public(string[64])
# @notice Returns the name of the token - e.g. "MyToken".
# @dev Optional requirement from ERC-20 and ERC-777.

symbol: public(string[32])
# @notice Returns the symbol of the token. E.g. “HIX”.
# @dev Optional requirement from ERC-20 and ERC-777

# Data storage required by the ERC-777 token standard
operators: map(address, map(address, bool)) # not public: exposed via `isOperatorFor`

#endregion

#region Constructor
##################################################

@public
def __init__():
  self.ERC1820Registry = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24) # constant for all networks

  # Register supported interfaces
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC20Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777TokensRecipient"), self)

@public
def initialize():
  assert self.owner == ZERO_ADDRESS, "ALREADY_INITIALIZED"
  self.owner = msg.sender

#endregion

#region Private helper functions
##################################################

@private
def _callTokensToSend(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256,
  _userData: bytes[256]="", # TODO remove default(?)
  _operatorData: bytes[256]=""
):
  """
  @dev Call from.tokensToSend() if the interface is registered
  @param operator address operator requesting the transfer
  @param from address token holder address
  @param to address recipient address
  @param amount uint256 amount of tokens to transfer
  @param userData bytes extra information provided by the token holder (if any)
  @param operatorData bytes extra information provided by the operator (if any)
  """
  implementer: address = self.ERC1820Registry.getInterfaceImplementer(_from, TOKENS_SENDER_INTERFACE_HASH)
  if(implementer != ZERO_ADDRESS):
    IERC777Sender(implementer).tokensToSend(_operator, _from, _to, _amount, _userData, _operatorData)

@private
def _callTokensReceived(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256,
  _requireReceptionAck: bool,
  _userData: bytes[256]="", # TODO remove default(?)
  _operatorData: bytes[256]=""
):
  """
  @dev Call to.tokensReceived() if the interface is registered. Reverts if the recipient is a contract but
  tokensReceived() was not registered for the recipient
  @param operator address operator requesting the transfer
  @param from address token holder address
  @param to address recipient address
  @param amount uint256 amount of tokens to transfer
  @param userData bytes extra information provided by the token holder (if any)
  @param operatorData bytes extra information provided by the operator (if any)
  @param requireReceptionAck if true, contract recipients are required to implement ERC777TokensRecipient
  """
  implementer: address = self.ERC1820Registry.getInterfaceImplementer(_to, TOKENS_RECIPIENT_INTERFACE_HASH)
  if(implementer != ZERO_ADDRESS):
    IERC777Recipient(implementer).tokensReceived(_operator, _from, _to, _amount, _userData, _operatorData)
  elif(_requireReceptionAck):
    assert not implementer.is_contract, "ERC777: token recipient contract has no implementer for ERC777TokensRecipient"

@private
def _burn(
  _operator: address,
  _from: address,
  _amount: uint256,
  _userData: bytes[256]="",
  _operatorData: bytes[256]=""
):
  assert _from != ZERO_ADDRESS, "ERC777: burn from the zero address"
  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(_operator, _from, ZERO_ADDRESS, _amount, _operatorData)

  self._callTokensToSend(_operator, _from, ZERO_ADDRESS, _amount) # TODO _userData, _operatorData
  self.totalSupply -= _amount
  self.balanceOf[_from] -= _amount
  log.Burned(_operator, _from, _amount, _userData, _operatorData)
  log.Transfer(_from, ZERO_ADDRESS, _amount)

@private
def _send(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256,
  _requireReceptionAck: bool,
  _userData: bytes[256]="",
  _operatorData: bytes[256]=""
):
  assert _from != ZERO_ADDRESS, "ERC777: send from the zero address"
  assert _to != ZERO_ADDRESS, "ERC777: send to the zero address"
  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(_operator, _from, _to, _amount, _operatorData)

  self._callTokensToSend(_operator, _from, _to, _amount) # TODO _userData _operatorData stack underflow
  self.balanceOf[_from] -= _amount
  self.balanceOf[_to] += _amount
  self._callTokensReceived(_operator, _from, _to, _amount, _requireReceptionAck) # TODO _userData _operatorData stack underflow

  log.Sent(_operator, _from, _to, _amount, _userData, _operatorData)
  log.Transfer(_from, _to, _amount)

#endregion

#region Functions required by the ERC-20 token standard
##################################################

@public
@constant
def allowance(
  _owner: address,
  _spender: address
) -> uint256:
  return self.allowances[_owner][_spender]

@public
@constant
def decimals() -> uint256:
  """
  @notice Returns the number of decimals the token uses - e.g. 8, means to divide
  the token amount by 100000000 to get its user representation.
  @dev This is optional per ERC-20 but must always be 18 per ERC-777
  """
  return 18

@public
def approve(
  _spender: address,
  _value: uint256
) -> bool:
  self.allowances[msg.sender][_spender] = _value
  log.Approval(msg.sender, _spender, _value)
  return True

@public
def transfer(
  _to: address,
  _value: uint256
) -> bool:
  self._send(msg.sender, msg.sender, _to, _value, False)
  return True

@public
def transferFrom(
  _from: address,
  _to: address,
  _value: uint256
) -> bool:
  self._send(msg.sender, _from, _to, _value, False)
  self.allowances[_from][msg.sender] -= _value
  return True
#endregion

#region Functions required by the ERC-777 token standard
##################################################

@public
@constant
def isOperatorFor(
  _operator: address,
  _tokenHolder: address
) -> bool:
  return _operator == _tokenHolder or _operator == self.owner or self.operators[_tokenHolder][_operator]

@public
@constant
def granularity() -> uint256:
  """
  @notice Get the smallest part of the token that’s not divisible.
  @dev Hard-coded to 1 as we have not identified a compelling use case for this.
  From the ERC-777 spec:
    NOTE: Most tokens SHOULD be fully partition-able. I.e., this function SHOULD
    return 1 unless there is a good reason for not allowing any fraction of the token.
  """
  return 1

@public
@constant
def defaultOperators() -> address[1]:
  """
  @notice Get the list of default operators as defined by the token contract.
  @dev Hard-coded to no default operators as we have not identified a compelling use
  case for this and to simplify the token implementation.
  """
  return [self.owner]

@public
def authorizeOperator(
  _operator: address
):
  assert _operator != msg.sender, "ERC777: authorizing self as operator"

  self.operators[msg.sender][_operator] = True
  log.AuthorizedOperator(_operator, msg.sender)

@public
def burn(
  _amount: uint256,
  _userData: bytes[256]
):
  self._burn(msg.sender, msg.sender, _amount) # TODO _userData, ""
  self.burnedSupply += _amount

@public
def operatorBurn(
  _account: address,
  _amount: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert self.isOperatorFor(msg.sender, _account), "ERC777: caller is not an operator for holder"
  self._burn(msg.sender, _account, _amount) # TODO _userData, _operatorData

@public
def operatorSend(
  _sender: address,
  _recipient: address,
  _amount: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert self.isOperatorFor(msg.sender, _sender), "ERC777: caller is not an operator for holder"
  self._send(msg.sender, _sender, _recipient, _amount, True, _userData, _operatorData)

@public
def revokeOperator(
  _operator: address
):
  assert _operator != msg.sender, "ERC777: revoking self as operator"

  clear(self.operators[msg.sender][_operator])
  log.RevokedOperator(_operator, msg.sender)

@public
def send(
  _recipient: address,
  _amount: uint256,
  _userData: bytes[256]
):
  self._send(msg.sender, msg.sender, _recipient, _amount, True, _userData)
#endregion

#region Functions for our business logic
##################################################

@public
@constant
def availableBalanceOf(
  _from: address
) -> uint256:
  if(self.authorization != ZERO_ADDRESS):
    return self.authorization.availableBalanceOf(_from)
  else:
    return self.balanceOf[_from]

@public
@payable
def mint(
  _operator: address,
  _to: address,
  _quantity: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert msg.sender == self.owner, "OWNER_ONLY"
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _quantity > 0, "INVALID_QUANTITY"

  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(_operator, ZERO_ADDRESS, _to, _quantity, _operatorData)

  self.totalSupply += _quantity
  self.balanceOf[_to] += _quantity
  self._callTokensReceived(_operator, ZERO_ADDRESS, _to, _quantity, True) # TODO _userData, _operatorData causes `stack underflow`
  log.Transfer(ZERO_ADDRESS, _to, _quantity)
  log.Minted(_operator, _to, _quantity, _userData, _operatorData)

#endregion


#region Function to update configuration
##################################################

@public
def updateConfig(
  _authorizationAddress: address,
  _name: string[64],
  _symbol: string[32]
):
  assert msg.sender == self.owner, "OWNER_ONLY"

  self.name = _name
  self.symbol = _symbol

  self.authorizationAddress = _authorizationAddress
  self.authorization = IAuthorization(_authorizationAddress)
  log.UpdateConfig(_authorizationAddress, _name, _symbol)

#endregion
