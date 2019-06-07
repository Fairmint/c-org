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

# Metadata suggested by the ERC-20 token standard
decimals: public(uint256)
name: public(string[64])
symbol: public(string[8])

# Data storage required by the ERC-20 token standard
balanceOf: public(map(address, uint256(tokens)))
totalSupply: public(uint256(tokens))
allowances: map(address, map(address, uint256(tokens))) # not public, data is exposed via the `allowance` function

# Data for c-org business logic
beneficiary: public(address)
tplInterface: public(ITPLERC20Interface)
initialReserve: public(uint256)

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

@public
def __init__(
  _name: string[64],
  _symbol: string[8],
  _decimals: uint256,
  _initialReserve: uint256,
  _tplInterface: address
):
  self.name = _name
  self.symbol = _symbol
  self.decimals = _decimals
  self.initialReserve = _initialReserve
  self.beneficiary = msg.sender
  self.tplInterface = ITPLERC20Interface(_tplInterface)

  self._mint(self.beneficiary, self.initialReserve)

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
def updateTplInterface(_tplInterface: address):
  assert msg.sender == self.beneficiary, "BENEFICIARY_ONLY"
  self.tplInterface = ITPLERC20Interface(_tplInterface)
