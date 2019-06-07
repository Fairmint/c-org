# c-org
# Reference implementation for continuous organizations

from vyper.interfaces import ERC20
implements: ERC20

units: {
  tokens: "c-org tokens"
}

# TODO: switch to an interface file (currently non-native imports fail to compile)
contract ITPLERC20Interface:
  def canTransfer(_to: address, _value: uint256(tokens)) -> bool: constant
  def canTransferFrom(_from: address, _to: address, _value: uint256(tokens)) -> bool: constant

# Events required by the ERC-20 token standard
Approval: event({_owner: indexed(address), _spender: indexed(address), _value: uint256(tokens)})
Transfer: event({_from: indexed(address), _to: indexed(address), _value: uint256(tokens)})

# Data for c-org business logic
beneficiary: public(address)
control: public(address)
currency: public(address)
initReserve: public(uint256)
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
  _initReserve: uint256,
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
def _mint(_to: address, _value: uint256(tokens)):
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert self.tplInterface.canTransferFrom(ZERO_ADDRESS, _to, _value), "NOT_TPL_APPROVED"

  self.totalSupply += _value
  self.balanceOf[_to] += _value
  log.Transfer(ZERO_ADDRESS, _to, _value)

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
  assert self.tplInterface.canTransfer(_to, _value), "NOT_TPL_APPROVED"

  self.balanceOf[msg.sender] -= _value
  self.balanceOf[_to] += _value
  log.Transfer(msg.sender, _to, _value)
  return True

@public
def transferFrom(_from: address, _to: address, _value: uint256(tokens)) -> bool:
  assert self.tplInterface.canTransferFrom(_from, _to, _value), "NOT_TPL_APPROVED"

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
@payable
def buy() -> bool:
  # TODO
  tokensPerWei: uint256(tokens / wei) = 42
  self._mint(msg.sender, msg.value * tokensPerWei)
  return True

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
