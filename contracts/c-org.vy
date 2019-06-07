# c-org
# Reference implementation for continuous organizations

from vyper.interfaces import ERC20
implements: ERC20

units: {
  tokens: "c-org tokens"
}

# TODO: switch to an interface file (currently non-native imports fail to compile)
contract ITPLERC20Interface:
  def authorizeTransfer(_from: address, _to: address, _value: uint256(tokens)) -> bool: modifying
  def authorizeTransferFrom(_sender: address, _from: address, _to: address, _value: uint256(tokens)): modifying

# Events required by the ERC-20 token standard
Approval: event({_owner: indexed(address), _spender: indexed(address), _value: uint256(tokens)})
Transfer: event({_from: indexed(address), _to: indexed(address), _value: uint256(tokens)})

# Data for c-org business logic
beneficiary: public(address)
control: public(address)
currency: public(address)
initReserve: public(uint256(tokens))
tplInterface: public(ITPLERC20Interface)

# Data storage required by the ERC-20 token standard
allowances: map(address, map(address, uint256(tokens))) # not public, data is exposed via the `allowance` function
balanceOf: public(map(address, uint256(tokens)))
totalSupply: public(uint256(tokens))

# Metadata suggested by the ERC-20 token standard
decimals: public(uint256)
name: public(string[64])
symbol: public(string[8])

@public
def __init__(
  _name: string[64],
  _symbol: string[8],
  _decimals: uint256,
  _initReserve: uint256(tokens),
  _currency: address,
  _tplInterface: address
):
  assert _tplInterface != ZERO_ADDRESS, "INVALID_ADDRESS"

  self.name = _name
  self.symbol = _symbol
  self.decimals = _decimals
  self.initReserve = _initReserve
  self.currency = _currency
  self.tplInterface = ITPLERC20Interface(_tplInterface)

  self.control = msg.sender
  self.beneficiary = msg.sender

  # Mint the initial reserve
  self.totalSupply = self.initReserve
  self.balanceOf[self.beneficiary] = self.initReserve
  log.Transfer(ZERO_ADDRESS, self.beneficiary, self.initReserve)

#
# Private helper functions
#

@private
def _burn(_from: address, _value: uint256(tokens)):
  assert _from != ZERO_ADDRESS, "INVALID_ADDRESS"
  # Note: no TPL authorization required to burn tokens

  self.totalSupply -= _value
  self.balanceOf[_from] -= _value
  log.Transfer(_from, ZERO_ADDRESS, _value)

#
# Functions required by the ERC-20 token standard
#

@public
def approve(_spender: address, _value: uint256(tokens)) -> bool:
  self.allowances[msg.sender][_spender] = _value
  log.Approval(msg.sender, _spender, _value)
  return True

@public
def transfer(_to: address, _value: uint256(tokens)) -> bool:
  assert self.tplInterface.authorizeTransfer(msg.sender, _to, _value), "NOT_TPL_APPROVED"

  self.balanceOf[msg.sender] -= _value
  self.balanceOf[_to] += _value
  log.Transfer(msg.sender, _to, _value)
  return True

@public
def transferFrom(_from: address, _to: address, _value: uint256(tokens)) -> bool:
  assert self.tplInterface.authorizeTransferFrom(msg.sender, _from, _to, _value), "NOT_TPL_APPROVED"

  self.balanceOf[_from] -= _value
  self.balanceOf[_to] += _value
  self.allowances[_from][msg.sender] -= _value
  log.Transfer(_from, _to, _value)
  return True

@public
@constant
def allowance(_owner: address, _spender: address) -> uint256(tokens):
  return self.allowances[_owner][_spender]

#
# Functions for c-org business logic
#

@public
def burn(_value: uint256(tokens)):
  self._burn(msg.sender, _value)

@public
@payable
def buy():
  # TODO
  tokensPerWei: uint256(tokens / wei) = 42
  value: uint256(tokens) = msg.value * tokensPerWei
  assert self.tplInterface.authorizeTransfer(ZERO_ADDRESS, msg.sender, value), "NOT_TPL_APPROVED"

  self.totalSupply += value
  self.balanceOf[_to] += value
  log.Transfer(ZERO_ADDRESS, msg.sender, value)

@public
def sell():
  assert self.tplInterface.authorizeTransfer(msg.sender, ZERO_ADDRESS, _value), "NOT_TPL_APPROVED"

  # TODO pay seller
  self._burn(msg.sender, _value)

#
# Functions to update c-org configuration
# These can only be called by the organization accounts
#

@public
def updateBeneficiary(_beneficiary: address):
  assert msg.sender == self.control or msg.sender == self.beneficiary, "CONTROL_OR_BENEFICIARY_ONLY"
  assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"

  self.beneficiary = _beneficiary

@public
def updateControl(_control: address):
  assert msg.sender == self.control, "CONTROL_ONLY"
  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"

  self.control = _control

@public
def updateName(_name: string[64]):
  assert msg.sender == self.control, "CONTROL_ONLY"

  self.name = _name

@public
def updateSymbol(_symbol: string[8]):
  assert msg.sender == self.control, "CONTROL_ONLY"

  self.symbol = _symbol

@public
def updateTplInterface(_tplInterface: address):
  assert msg.sender == self.control, "CONTROL_ONLY"
  assert _tplInterface != ZERO_ADDRESS, "INVALID_ADDRESS"

  self.tplInterface = ITPLERC20Interface(_tplInterface)
