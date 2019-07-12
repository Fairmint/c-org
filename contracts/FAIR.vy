# FAIR tokens
# ERC-777 and ERC-20 compliance token
# Allows the owner to mint tokens and uses IAuthorization to validate transfers
# "Owned" by the DAT contract which is also an approved operator for accounts.

#region Types
##################################################

from vyper.interfaces import ERC20

# TODO: switch to interface files (currently non-native imports fail to compile)
# Depends on https://github.com/ethereum/vyper/issues/1367
contract IAuthorization:
  def authorizeTransfer(
    _operator: address,
    _from: address,
    _to: address,
    _value: uint256,
    _userData: bytes[1024],
    _operatorData: bytes[1024]
  ): modifying
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
    _userData: bytes[1024],
    _operatorData: bytes[1024]
  ): modifying
contract IERC777Sender:
  def tokensToSend(
    _operator: address,
    _from: address,
    _to: address,
    _amount: uint256,
    _userData: bytes[1024],
    _operatorData: bytes[1024]
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
  _userData: bytes[1024],
  _operatorData: bytes[1024]
})
Minted: event({
  _operator: indexed(address),
  _to: indexed(address),
  _amount: uint256,
  _userData: bytes[1024],
  _operatorData: bytes[1024]
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
  _userData: bytes[1024],
  _operatorData: bytes[1024]
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

# TODO test Vyper comment format with b11 (does not seem to work on data with b10)

##############
# Constants
##############

MAX_SUPPLY: constant(uint256)  = 10 ** 28
# @notice The max `totalSupply + burnedSupply`
# @dev This limit ensures that the DAT's formulas do not overflow

# TODO test gas of using hex directly instead
TOKENS_SENDER_INTERFACE_HASH: constant(bytes32) = keccak256("ERC777TokensSender")
# @notice The ERC-1820 ID for the ERC-777 sender hook

TOKENS_RECIPIENT_INTERFACE_HASH: constant(bytes32) = keccak256("ERC777TokensRecipient")
# @notice The ERC-1820 ID for the ERC-777 receiver hook

ERC1820Registry: IERC1820Registry 
# @notice The ERC-1820 contract for registering and checking for interface support.
# @dev not public: constant data (but initialized in __init__)

##############
# Data specific to our business logic
##############

authorizationAddress: public(address)
# @notice The contract address for transfer authorizations, if any.
# @dev This contract must implement the IAuthorization interface above

authorization: IAuthorization 
# @notice The contract for transfer authorizations, if any.
# @dev This is redundant w/ authorizationAddress, for convenience

burnedSupply: public(uint256)
# @notice The total number of burned FAIR tokens, excluding tokens burned from a `Sell` action in the DAT.

owner: public(address)
# @notice The DAT contract for this token, which is authorized to buy/sell tokens.

##############
# Data storage required by the ERC-20 token standard
##############

allowances: map(address, map(address, uint256)) 
# @notice Stores the `from` address to the `operator` address to the max value that operator is authorized to transfer.
# @dev not public: exposed via `allowance`

balanceOf: public(map(address, uint256))
# @notice Returns the account balance of another account with address _owner.

totalSupply: public(uint256)
# @notice The total number of tokens currently in circulation
# @dev This does not include the burnedSupply

##############
# Metadata suggested by the ERC-20 token standard
##############

name: public(string[64])
# @notice Returns the name of the token - e.g. "MyToken".
# @dev Optional requirement from ERC-20 and ERC-777.

symbol: public(string[32])
# @notice Returns the symbol of the token. E.g. “HIX”.
# @dev Optional requirement from ERC-20 and ERC-777

##############
# Data storage required by the ERC-777 token standard
##############

operators: map(address, map(address, bool))
# @notice Stores the `from` address to the `operator` address to a bool for if that operator is authorized to transfer.
# @dev not public: exposed via `isOperatorFor`

#endregion

#region Init
##################################################

@public
def initialize():
  """
  @notice Called once to complete contract setup.
  @dev Called by the DAT contract when it is deployed. No tokens can be minted until this is called.
  If someone front-runs this call the DAT deployment will fail and we can deploy a new FAIR token.
  1820 registration is here instead of in __init__ in order to support upgrades.
  """
  assert self.owner == ZERO_ADDRESS, "ALREADY_INITIALIZED"
  self.ERC1820Registry = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24) # constant for all networks

  # Register supported interfaces
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC20Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777TokensRecipient"), self)

  # Register owner (the DAT contract)
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
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @dev Call from.tokensToSend() if the interface is registered
  params from the ERC-777 token standard
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
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @dev Call to.tokensReceived() if the interface is registered. Reverts if the recipient is a contract but
  tokensReceived() was not registered for the recipient
  @param requireReceptionAck if true, contract recipients are required to implement ERC777TokensRecipient
  other params from the ERC-777 token standard
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
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @dev Confirms auth and then removes tokens from the circulating supply.
  params from the ERC-777 token standard
  """
  assert _from != ZERO_ADDRESS, "ERC777: burn from the zero address"
  self.authorization.authorizeTransfer(_operator, _from, ZERO_ADDRESS, _amount, _userData, _operatorData)

  self._callTokensToSend(_operator, _from, ZERO_ADDRESS, _amount, _userData, _operatorData)

  self.balanceOf[_from] -= _amount
  self.totalSupply -= _amount

  # Only increase the burnedSupply if a `burn` vs a `sell` via the DAT.
  if(_operator != self.owner):
    self.burnedSupply += _amount

  log.Burned(_operator, _from, _amount, _userData, _operatorData)
  log.Transfer(_from, ZERO_ADDRESS, _amount)

@private
def _send(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256,
  _requireReceptionAck: bool,
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @dev Confirms auth and then moves tokens from one account to another.
  """
  assert _from != ZERO_ADDRESS, "ERC777: send from the zero address"
  assert _to != ZERO_ADDRESS, "ERC777: send to the zero address"
  self.authorization.authorizeTransfer(_operator, _from, _to, _amount, _userData, _operatorData)

  self._callTokensToSend(_operator, _from, _to, _amount, _userData, _operatorData)
  self.balanceOf[_from] -= _amount
  self.balanceOf[_to] += _amount
  self._callTokensReceived(_operator, _from, _to, _amount, _requireReceptionAck, _userData, _operatorData)

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
  """
  @notice Returns the amount which `_spender` is still allowed to withdraw from `_owner`.
  """
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
  """
  @notice Allows `_spender` to withdraw from your account multiple times, up to the `_value` amount. 
  @dev If this function is called again it overwrites the current allowance with `_value`.
  """
  self.allowances[msg.sender][_spender] = _value
  log.Approval(msg.sender, _spender, _value)
  return True

@public
def transfer(
  _to: address,
  _value: uint256
) -> bool:
  """
  @notice Transfers `_value` amount of tokens to address `_to` if authorized.
  """
  self._send(msg.sender, msg.sender, _to, _value, False, "", "")
  return True

@public
def transferFrom(
  _from: address,
  _to: address,
  _value: uint256
) -> bool:
  """
  @notice Transfers `_value` amount of tokens from address `_from` to address `_to` if authorized.
  """
  self._send(msg.sender, _from, _to, _value, False, "", "")
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
  """
  @notice Indicates whether the operator address is an approved operator for the token holder.
  @dev The owner, which is the DAT contract, is always an approved operator.
  """
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
  @dev Hard-coded to include just the owner, which is the DAT contract.
  """
  return [self.owner]

@public
def authorizeOperator(
  _operator: address
):
  """
  @notice Set a third party operator address as an operator of msg.sender to send and burn tokens on its behalf.
  """
  assert _operator != msg.sender, "ERC777: authorizing self as operator"

  self.operators[msg.sender][_operator] = True
  log.AuthorizedOperator(_operator, msg.sender)

@public
def revokeOperator(
  _operator: address
):
  """
  @notice Remove the right of the operator address to be an operator for msg.sender and to send and burn tokens on its behalf.
  @dev The defaultOperator cannot be revoked.
  """
  assert _operator != msg.sender, "ERC777: revoking self as operator"

  clear(self.operators[msg.sender][_operator])
  log.RevokedOperator(_operator, msg.sender)

@public
def burn(
  _amount: uint256,
  _userData: bytes[1024]
):
  """
  @notice Burn the amount of tokens from the address msg.sender if authorized.
  @dev Note that this is not the same as a `sell` via the DAT.
  """
  self._burn(msg.sender, msg.sender, _amount, _userData, "")

@public
def operatorBurn(
  _from: address,
  _amount: uint256,
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @notice Burn the amount of tokens on behalf of the address from if authorized.
  @dev In addition to the standard ERC-777 use case, this is used by the DAT to `sell` tokens.
  """
  assert self.isOperatorFor(msg.sender, _from), "ERC777: caller is not an operator for holder"
  self._burn(msg.sender, _from, _amount, _userData, _operatorData)

@public
def send(
  _to: address,
  _amount: uint256,
  _userData: bytes[1024]
):
  """
  @notice Send the amount of tokens from the address msg.sender to the address to.
  """
  self._send(msg.sender, msg.sender, _to, _amount, True, _userData, "")

@public
def operatorSend(
  _from: address,
  _to: address,
  _amount: uint256,
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @notice Send the amount of tokens on behalf of the address from to the address to.
  """
  assert self.isOperatorFor(msg.sender, _from), "ERC777: caller is not an operator for holder"
  self._send(msg.sender, _from, _to, _amount, True, _userData, _operatorData)

#endregion

#region Functions for our business logic
##################################################

@public
@payable
def mint(
  _operator: address,
  _to: address,
  _quantity: uint256,
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @notice Called by the owner, which is the DAT contract, in order to mint tokens on `buy`.
  """
  assert msg.sender == self.owner, "OWNER_ONLY"
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _quantity > 0, "INVALID_QUANTITY"

  if(self.authorization != ZERO_ADDRESS): # This is not set for the minting of initialReserve
    self.authorization.authorizeTransfer(_operator, ZERO_ADDRESS, _to, _quantity, _userData, _operatorData)

  self.totalSupply += _quantity
  # Math: If this value got too large, the DAT would overflow on sell
  assert self.totalSupply + self.burnedSupply <= MAX_SUPPLY, "EXCESSIVE_SUPPLY"
  self.balanceOf[_to] += _quantity
  
  self._callTokensReceived(_operator, ZERO_ADDRESS, _to, _quantity, True, _userData, _operatorData)
  
  log.Transfer(ZERO_ADDRESS, _to, _quantity)
  log.Minted(_operator, _to, _quantity, _userData, _operatorData)

@public
def updateConfig(
  _authorizationAddress: address,
  _name: string[64],
  _symbol: string[32]
):
  """
  @notice Called by the owner, which is the DAT contract, in order to change the token configuration.
  @dev If a field such as _name is not being changed, simply send the current value when calling this function.
  """
  assert msg.sender == self.owner, "OWNER_ONLY"

  self.name = _name
  self.symbol = _symbol

  assert _authorizationAddress != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.authorizationAddress = _authorizationAddress
  self.authorization = IAuthorization(_authorizationAddress)

  log.UpdateConfig(_authorizationAddress, _name, _symbol)

#endregion
