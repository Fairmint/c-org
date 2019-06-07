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
  def authorizeTransferFrom(_sender: address, _from: address, _to: address, _value: uint256(tokens)) -> bool: modifying

# Events required by the ERC-20 token standard
Approval: event({_owner: indexed(address), _spender: indexed(address), _value: uint256(tokens)})
Transfer: event({_from: indexed(address), _to: indexed(address), _value: uint256(tokens)})

# Events triggered when updating the c-org configuration
BeneficiaryTransferred: event({_previousBeneficiary: address, _beneficiary: address})
ControlTransferred: event({_previousControl: address, _control: address})
NameUpdated: event({_previousName: string[64], _name: string[64]})
SymbolUpdated: event({_previousSymbol: string[8], _symbol: string[8]})
TplInterfaceUpdated: event({_previousTplInterface: address, _tplInterface: address})

# Data for c-org business logic
beneficiary: public(address)
control: public(address)
currency: public(address)
initReserve: public(uint256(tokens))
tplInterfaceAddress: public(address)
tplInterface: ITPLERC20Interface # redundant information with tplInterfaceAddress, for convenient usage

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
  _tplInterfaceAddress: address
):
  assert _tplInterfaceAddress.is_contract, "INVALID_CONTRACT_ADDRESS"

  log.NameUpdated(self.name, _name)
  self.name = _name
  
  log.SymbolUpdated(self.symbol, _symbol)
  self.symbol = _symbol
  
  self.decimals = _decimals
  
  # Mint the initial reserve
  self.initReserve = _initReserve
  self.totalSupply = self.initReserve
  self.balanceOf[self.beneficiary] = self.initReserve
  log.Transfer(ZERO_ADDRESS, self.beneficiary, self.initReserve)
  
  self.currency = _currency

  log.TplInterfaceUpdated(self.tplInterfaceAddress, _tplInterfaceAddress)
  self.tplInterfaceAddress = _tplInterfaceAddress
  self.tplInterface = ITPLERC20Interface(_tplInterfaceAddress)

  log.ControlTransferred(self.control, msg.sender)
  self.control = msg.sender
  
  log.BeneficiaryTransferred(self.beneficiary, msg.sender)
  self.beneficiary = msg.sender

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
  authorized: bool = self.tplInterface.authorizeTransfer(msg.sender, _to, _value)
  assert authorized, "TPL_NOT_AUTHORIZED"

  self.balanceOf[msg.sender] -= _value
  self.balanceOf[_to] += _value
  log.Transfer(msg.sender, _to, _value)
  return True

@public
def transferFrom(_from: address, _to: address, _value: uint256(tokens)) -> bool:
  authorized: bool = self.tplInterface.authorizeTransferFrom(msg.sender, _from, _to, _value)
  assert authorized, "TPL_NOT_AUTHORIZED"

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
  tokenValue: uint256(tokens) = msg.value * tokensPerWei
  authorized: bool = self.tplInterface.authorizeTransfer(ZERO_ADDRESS, msg.sender, tokenValue)
  assert authorized, "TPL_NOT_AUTHORIZED"

  self.totalSupply += tokenValue
  self.balanceOf[msg.sender] += tokenValue
  log.Transfer(ZERO_ADDRESS, msg.sender, tokenValue)

@public
def sell(_value: uint256(tokens)):
  authorized: bool = self.tplInterface.authorizeTransfer(msg.sender, ZERO_ADDRESS, _value)
  assert authorized, "TPL_NOT_AUTHORIZED"

  # TODO pay seller
  self._burn(msg.sender, _value)

#
# Functions to update c-org configuration
# These can only be called by the organization accounts
#

@public
def transferBeneficiary(_beneficiary: address):
  assert msg.sender == self.control or msg.sender == self.beneficiary, "CONTROL_OR_BENEFICIARY_ONLY"
  assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"

  log.BeneficiaryTransferred(self.beneficiary, _beneficiary)
  self.beneficiary = _beneficiary

@public
def transferControl(_control: address):
  assert msg.sender == self.control, "CONTROL_ONLY"
  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"

  log.ControlTransferred(self.control, _control)
  self.control = _control

@public
def updateName(_name: string[64]):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.NameUpdated(self.name, _name)
  self.name = _name

@public
def updateSymbol(_symbol: string[8]):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.SymbolUpdated(self.symbol, _symbol)
  self.symbol = _symbol

@public
def updateTplInterface(_tplInterfaceAddress: address):
  assert msg.sender == self.control, "CONTROL_ONLY"
  assert _tplInterfaceAddress.is_contract, "INVALID_CONTRACT_ADDRESS"

  log.TplInterfaceUpdated(self.tplInterfaceAddress, _tplInterfaceAddress)
  self.tplInterfaceAddress = _tplInterfaceAddress
  self.tplInterface = ITPLERC20Interface(_tplInterfaceAddress)
