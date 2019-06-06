# c-org
# Reference implementation for continuous organizations

from vyper.interfaces import ERC20
implements: ERC20

units: {
  tokens: "c-org tokens"
}

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

@public
def __init__():
  self.beneficiary = msg.sender

#
# Private helper functions
#

@private
def _mint(_to: address, _value: uint256(tokens)):
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.totalSupply += _value
  self.balanceOf[_to] += _value
  log.Transfer(ZERO_ADDRESS, _to, _value)

#
# Functions required by the ERC-20 token standard
#

@public
def approve(_spender: address, _value: uint256) -> bool:
  # TODO
  return True

@public
def transfer(_to: address, _value: uint256) -> bool:
  # TODO
  return True

@public
def transferFrom(_from: address, _to: address, _value: uint256) -> bool:
  # TODO
  return True

@public
@constant
def allowance(_owner: address, _spender: address) -> uint256:
  # TODO
  return 0

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
