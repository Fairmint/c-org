# Decentralized Autonomous Trust

#region Types
##################################################
units: {
  currencyTokens: "The reserve currency - either ETH or ERC20",
  denominator: "Fraction denominator",
  FAIRs: "FAIR Securities",
  numerator: "Fraction numerator",
  stateMachine: "The DAT's internal state machine"
}

from vyper.interfaces import ERC20
implements: ERC20

# TODO: switch to interface files (currently non-native imports fail to compile)
contract IAuthorization:
  def authorizeTransfer(
    _operator: address,
    _from: address,
    _to: address,
    _value: uint256(FAIRs)
  ): modifying
  def availableBalanceOf(
    _from: address
  ) -> uint256(FAIRs): constant
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
    _amount: uint256(FAIRs),
    _data: bytes[32],
    _operatorData: bytes[32]
  ): modifying
contract IERC777Sender:
  def tokensToSend(
    _operator: address,
    _from: address,
    _to: address,
    _amount: uint256(FAIRs),
    _userData: bytes[32],
    _operatorData: bytes[32]
  ): modifying

# Events required by the ERC-20 token standard
Approval: event({
  _owner: indexed(address),
  _spender: indexed(address),
  _value: uint256(FAIRs)
})
Transfer: event({
  _from: indexed(address),
  _to: indexed(address),
  _value: uint256(FAIRs)
})

# Events required by the ERC-777 token standard
AuthorizedOperator: event({
  _operator: indexed(address),
  _tokenHolder: indexed(address)
})
Burned: event({
  _operator: indexed(address),
  _from: indexed(address),
  _amount: uint256(FAIRs),
  _data: bytes[32],
  _operatorData: bytes[32]
})
Minted: event({
  _operator: indexed(address),
  _to: indexed(address),
  _amount: uint256(FAIRs),
  _data: bytes[32],
  _operatorData: bytes[32]
})
RevokedOperator: event({
  _operator: indexed(address),
  _tokenHolder: indexed(address)
})
Sent: event({
  _operator: indexed(address),
  _from: indexed(address),
  _to: indexed(address),
  _amount: uint256(FAIRs),
  _data: bytes[32],
  _operatorData: bytes[32]
})

# Events triggered when updating the DAT's configuration
AuthorizationAddressUpdated: event({
  _previousAuthorizationAddress: indexed(address),
  _authorizationAddress: indexed(address)
})
BeneficiaryTransferred: event({
  _previousBeneficiary: indexed(address),
  _beneficiary: indexed(address)
})
BurnThresholdUpdated: event({
  _previousBurnThresholdNum: uint256(numerator),
  _previousBurnThresholdDen: uint256(denominator),
  _burnThreshdoldNum: uint256(numerator),
  _burnThreshdoldDen: uint256(denominator)
})
ControlTransferred: event({
  _previousControl: indexed(address),
  _control: indexed(address)
})
FeeCollectorTransferred: event({
  _previousFeeCollector: address,
  _feeCollector: address
})
FeeUpdated: event({
  _previousFeeNum: uint256(numerator),
  _previousFeeDen: uint256(denominator),
  _eeeNum: uint256(numerator),
  _feeDen: uint256(denominator)
})
MinInvestmentUpdated: event({
  _previousMinInvestment: uint256(currencyTokens),
  _minInvestment: uint256(currencyTokens)
})
NameUpdated: event({
  _previousName: string[64],
  _name: string[64]
})
SymbolUpdated: event({
  _previousSymbol: string[8],
  _symbol: string[8]
})
#endregion

#region Data
##################################################
# Constants
STATE_INITIALIZATION: constant(uint256(stateMachine)) = 0
STATE_RUNNING: constant(uint256(stateMachine)) = 1
STATE_CLOSING: constant(uint256(stateMachine)) = 2
# TODO test gas of using hex directly (this is not cached in Solidity)
TOKENS_SENDER_INTERFACE_HASH: constant(bytes32) = keccak256("ERC777TokensSender")
TOKENS_RECIPIENT_INTERFACE_HASH: constant(bytes32) = keccak256("ERC777TokensRecipient")

# Data for DAT business logic
authorizationAddress: public(address)
authorization: IAuthorization # redundant w/ authorizationAddress, for convenience
beneficiary: public(address)
burnThresholdNum: public(uint256(numerator))
burnThresholdDen: public(uint256(denominator))
buySlopeNum: public(uint256(numerator))
buySlopeDen: public(uint256(denominator))
control: public(address)
currencyAddress: public(address)
currency: ERC20 # redundant w/ currencyAddress, for convenience
initDeadline: public(timestamp)
initGoal: public(uint256(currencyTokens))
initReserve: public(uint256(FAIRs))
investmentReserveNum: public(uint256(numerator))
investmentReserveDen: public(uint256(denominator))
minInvestment: public(uint256(currencyTokens))
revenueCommitmentNum: public(uint256(numerator))
revenueCommitmentDen: public(uint256(denominator))
state: public(uint256(stateMachine))

# Data storage required by the ERC-20 token standard
allowances: map(address, map(address, uint256(FAIRs))) # not public: exposed via `allowance`
balanceOf: public(map(address, uint256(FAIRs)))
totalSupply: public(uint256(FAIRs))

# Metadata suggested by the ERC-20 token standard
name: public(string[64])
symbol: public(string[8])

# Data storage required by the ERC-777 token standard
ERC1820Registry: IERC1820Registry # not public: constant data
operators: map(address, map(address, bool)) # not public: exposed via `isOperatorFor`
#endregion

#region Constructor
##################################################
@public
def __init__(
  _name: string[64],
  _symbol: string[8],
  _initReserve: uint256(FAIRs),
  _currencyAddress: address,
  _initGoal: uint256(currencyTokens),
  _minInvestment: uint256(currencyTokens),
  _initDeadline: timestamp,
  _buySlopeNum: uint256(numerator),
  _buySlopeDen: uint256(denominator),
  _investmentReserveNum: uint256(numerator),
  _investmentReserveDen: uint256(denominator),
  _revenueCommitmentNum: uint256(numerator),
  _revenueCommitmentDen: uint256(denominator),
  _authorizationAddress: address
):
  assert _authorizationAddress.is_contract, "INVALID_CONTRACT_ADDRESS"

  self.ERC1820Registry = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24) # constant for all networks

  # TODO test method calls
  log.NameUpdated(self.name, _name)
  self.name = _name

  log.SymbolUpdated(self.symbol, _symbol)
  self.symbol = _symbol

  # Mint the initial reserve
  self.initReserve = _initReserve
  self.totalSupply = self.initReserve
  self.balanceOf[self.beneficiary] = self.initReserve
  log.Transfer(ZERO_ADDRESS, self.beneficiary, self.initReserve)

  self.currencyAddress = _currencyAddress
  self.currency = ERC20(_currencyAddress)

  # Set initGoal, which in turn defines the initial state
  if(_initGoal == 0):
    self.state = STATE_RUNNING
  else:
    self.initGoal = _initGoal

  log.MinInvestmentUpdated(self.minInvestment, _minInvestment)
  self.minInvestment = _minInvestment

  self.initDeadline = _initDeadline
  self.buySlopeNum = _buySlopeNum
  self.buySlopeDen = _buySlopeDen
  self.investmentReserveNum = _investmentReserveNum
  self.investmentReserveDen = _investmentReserveDen
  self.revenueCommitmentNum = _revenueCommitementNum
  self.revenueCommitmentDen = _revenueCommitementDen

  log.AuthorizationAddressUpdated(self.authorizationAddress, _authorizationAddress)
  self.authorizationAddress = _authorizationAddress
  self.authorization = IAuthorization(_authorizationAddress)

  self.burnThresholdNum = 1

  log.ControlTransferred(self.control, msg.sender)
  self.control = msg.sender

  log.BeneficiaryTransferred(self.beneficiary, msg.sender)
  self.beneficiary = msg.sender

  log.FeeCollectorTransferred(self.feeCollector, msg.sender)
  self.feeCollector = msg.sender

  # Register supported interfaces
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC20Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777Token"), self)
#endregion

#region Private helper functions
##################################################
@private
def _callTokensToSend(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256(FAIRs),
  _userData: bytes[32],
  _operatorData: bytes[32]
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
  _amount: uint256(FAIRs),
  _userData: bytes[32],
  _operatorData: bytes[32],
  _requireReceptionAck: bool
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
  _amount: uint256(FAIRs),
  _data: bytes[32],
  _operatorData: bytes[32]
):
  assert _from != ZERO_ADDRESS, "ERC777: burn from the zero address"
  # Note: no authorization required to burn tokens

  self._callTokensToSend(_operator, _from, ZERO_ADDRESS, _amount, _data, _operatorData)
  self.totalSupply -= _amount
  self.balanceOf[_from] -= _amount
  log.Burned(_operator, _from, _amount, _data, _operatorData)
  log.Transfer(_from, ZERO_ADDRESS, _amount)

@private
def _send(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256(FAIRs),
  _userData: bytes[32],
  _operatorData: bytes[32],
  _requireReceptionAck: bool
):
  assert _from != ZERO_ADDRESS, "ERC777: send from the zero address"
  assert _to != ZERO_ADDRESS, "ERC777: send to the zero address"
  self.authorization.authorizeTransfer(_operator, _from, _to, _amount)

  self._callTokensToSend(_operator, _from, _to, _amount, _userData, _operatorData)
  self.balanceOf[_from] -= _amount
  self.balanceOf[_to] += _amount
  self._callTokensReceived(_operator, _from, _to, _amount, _userData, _operatorData, _requireReceptionAck)

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
) -> uint256(FAIRs):
  return self.allowances[_owner][_spender]

@public
@constant
def decimals() -> uint256:
  return 18 # Must be 18 per ERC-777

@public
def approve(
  _spender: address,
  _value: uint256(FAIRs)
) -> bool:
  self.allowances[msg.sender][_spender] = _value
  log.Approval(msg.sender, _spender, _value)
  return True

@public
def transfer(
  _to: address,
  _value: uint256(FAIRs)
) -> bool:
  self._send(msg.sender, msg.sender, _to, _value, "", "", False)
  return True

@public
def transferFrom(
  _from: address,
  _to: address,
  _value: uint256(FAIRs)
) -> bool:
  self._send(msg.sender, _from, _to, _value, "", "", False)
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
  return _operator == _tokenHolder or self.operators[_tokenHolder][_operator]

@public
@constant
def granularity() -> uint256:
  return 1 # Always 1 for ERC-20 compatibility

@public
@constant
def defaultOperators() -> uint256:
  return 0 # No default operators simplifies implementation

@public
def authorizeOperator(
  _operator: address
):
  assert _operator != msg.sender, "ERC777: authorizing self as operator"

  self.operators[msg.sender][_operator] = True
  log.AuthorizedOperator(_operator, msg.sender)

@public
def burn(
  _amount: uint256(FAIRs),
  _data: bytes[32]
):
  self._burn(msg.sender, msg.sender, _amount, _data, "")

@public
def operatorBurn(
  _account: address,
  _amount: uint256,
  _data: bytes[32],
  _operatorData: bytes[32]
):
  assert self.isOperatorFor(msg.sender, _account), "ERC777: caller is not an operator for holder"
  self._burn(msg.sender, _account, _amount, _data, _operatorData)

@public
def operatorSend(
  _sender: address,
  _recipient: address,
  _amount: uint256,
  _data: bytes[32],
  _operatorData: bytes[32]
):
  assert self.isOperatorFor(msg.sender, _sender), "ERC777: caller is not an operator for holder"
  self._send(msg.sender, _sender, _recipient, _amount, _data, _operatorData, True)

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
  _data: bytes[32]
):
  self._send(msg.sender, msg.sender, _recipient, _amount, _data, "", True)
#endregion

#region Functions for DAT business logic
##################################################
@public
@constant
def availableBalanceOf(
  _from: address
) -> uint256:
  if(state == STATE_INITIALIZATION):
    return 0
  else:
    return self.authorization.availableBalanceOf(_from)

@public
@payable
def buy(
  _quantityToInvest: uint256(currencyTokens)
):
  # Collect investment
  if(self.currency == ZERO_ADDRESS):
    assert as_wei_value(_quantityToInvest, 'wei') == msg.value, "INCORRECT_MSG_VALUE"
  else:
    # TODO support ERC-777 currency?
    assert msg.value == 0, "DO_NOT_SEND_ETH"
    balanceBefore: uint256 = self.currency.balanceOf(self)
    self.currency.transferFrom(msg.sender, self, as_unitless_number(_quantityToInvest))
    assert self.currency.balanceOf(self) > balanceBefore, "ERC20_TRANSFER_FAILED"

  tokenValue: uint256(FAIRs)
  # TODO placeholder
  if(self.state == STATE_INITIALIZATION):
    tokensPerCurrency: uint256(FAIRs / currencyTokens) = 42
    tokenValue = _quantityToInvest * tokensPerCurrency
  elif(self.state == STATE_RUNNING):
    tokenValue = 1
  else:
    assert False, "INVALID_STATE"

  assert tokenValue > 0, "NOT_ENOUGH_FUNDS"
  self.authorization.authorizeTransfer(msg.sender, ZERO_ADDRESS, msg.sender, tokenValue)

  self.totalSupply += tokenValue
  self.balanceOf[msg.sender] += tokenValue
  # TODO causes a stack underflow ? self._callTokensReceived(msg.sender, ZERO_ADDRESS, msg.sender, tokenValue, "", "", True)
  log.Transfer(ZERO_ADDRESS, msg.sender, tokenValue)
  # TODO why does this fail? log.Minted(msg.sender, msg.sender, tokenValue, "", "")

@public
def sell(
  _amount: uint256(FAIRs)
):
  self.authorization.authorizeTransfer(msg.sender, msg.sender, ZERO_ADDRESS, _amount)

  # TODO send currency
  self._burn(msg.sender, msg.sender, _amount, "", "")
#endregion

#region Functions to update DAT configuration
##################################################
# These can only be called by the organization accounts

@public
def updateAuthorization(
  _authorizationAddress: address
):
  assert msg.sender == self.control, "CONTROL_ONLY"
  assert _authorizationAddress.is_contract, "INVALID_CONTRACT_ADDRESS"

  log.AuthorizationAddressUpdated(self.authorizationAddress, _authorizationAddress)
  self.authorizationAddress = _authorizationAddress
  self.authorization = IAuthorization(_authorizationAddress)

@public
def transferBeneficiary(
  _beneficiary: address
):
  assert msg.sender == self.control or msg.sender == self.beneficiary, "CONTROL_OR_BENEFICIARY_ONLY"
  assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"

  log.BeneficiaryTransferred(self.beneficiary, _beneficiary)
  self.beneficiary = _beneficiary

@public
def transferControl(
  _control: address
):
  assert msg.sender == self.control, "CONTROL_ONLY"
  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"

  log.ControlTransferred(self.control, _control)
  self.control = _control

@public
def transferFeeCollector(
  _feeCollector: address
):
  assert msg.sender == self.control or msg.sender == self.feeCollector, "CONTROL_OR_FEE_COLLECTOR_ONLY"
  assert _feeCollector != ZERO_ADDRESS, "INVALID_ADDRESS"

  log.FeeCollectorTransferred(self.feeCollector, _feeCollector)
  self.feeCollector = _feeCollector

@public
def updateBurnThreshold(
  _burnThreshdoldNum: uint256(numerator),
  _burnThreshdoldDen: uint256(denominator)
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.BurnThresholdUpdated(self.burnThresholdNum, self.burnThresholdDen, _burnThreshdoldNum, burnThresholdDen)
  self.burnThresholdNum = _burnThreshdoldNum
  self.burnThresholdDen = _burnThreshdoldDen

@public
def updateFee(
  _feeNum: uint256(numerator),
  _feeDen: uint256(denominator)
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.FeeUpdated(self.feeNum, self.feeDen, _feeNum, _feeDen)
  self.feeNum = _feeNum
  self.feeDen = _feeDen

@public
def updateMinInvestment(
  _minInvestment: uint256(currencyTokens)
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.MinInvestmentUpdated(self.minInvestment, _minInvestment)
  self.minInvestment = _minInvestment

@public
def updateName(
  _name: string[64]
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.NameUpdated(self.name, _name)
  self.name = _name

@public
def updateSymbol(
  _symbol: string[8]
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  log.SymbolUpdated(self.symbol, _symbol)
  self.symbol = _symbol
#endregion
