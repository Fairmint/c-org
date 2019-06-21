# Decentralized Autonomous Trust

#region Types
##################################################

units: {
  stateMachine: "The DAT's internal state machine"
}

from vyper.interfaces import ERC20

# TODO: switch to interface files (currently non-native imports fail to compile)
# Depends on https://github.com/ethereum/vyper/issues/1367
contract IAuthorization:
  def authorizeTransfer(
    _operator: address,
    _from: address,
    _to: address,
    _value: uint256
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
#TODO why does this fail? implements: IERC777Recipient

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

# Events triggered when updating the DAT's configuration
UpdateConfig: event({
  _authorizationAddress: address,
  _beneficiary: indexed(address),
  _control: indexed(address),
  _feeCollector: indexed(address),
  _burnThresholdNum: uint256,
  _burnThresholdDen: uint256,
  _feeNum: uint256,
  _feeDen: uint256,
  _minInvestment: uint256,
  _name: string[64],
  _symbol: string[32]
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
burnedSupply: public(uint256)
burnThresholdNum: public(uint256)
burnThresholdDen: public(uint256)
buySlopeNum: public(uint256)
buySlopeDen: public(uint256)
control: public(address)
currencyAddress: public(address)
currency: ERC20 # redundant w/ currencyAddress, for convenience
feeCollector: public(address)
feeNum: public(uint256)
feeDen: public(uint256)
initDeadline: public(timestamp)
initGoal: public(uint256)
initInvestors: public(map(address, uint256))
initReserve: public(uint256)
investmentReserveNum: public(uint256)
investmentReserveDen: public(uint256)
minInvestment: public(uint256)
revenueCommitmentNum: public(uint256)
revenueCommitmentDen: public(uint256)
state: public(uint256(stateMachine))

#endregion

#region Constructor
##################################################

@public
def __init__(
  _initReserve: uint256,
  _currencyAddress: address,
  _initGoal: uint256,
  _initDeadline: timestamp,
  _buySlopeNum: uint256,
  _buySlopeDen: uint256,
  _investmentReserveNum: uint256,
  _investmentReserveDen: uint256,
  _revenueCommitmentNum: uint256,
  _revenueCommitmentDen: uint256
):
  self.ERC1820Registry = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24) # constant for all networks

  self.currencyAddress = _currencyAddress
  self.currency = ERC20(_currencyAddress)

  # Set initGoal, which in turn defines the initial state
  if(_initGoal == 0):
    self.state = STATE_RUNNING
  else:
    self.initGoal = _initGoal

  self.initDeadline = _initDeadline
  assert _buySlopeNum > 0, "INVALID_SLOPE_NUM"
  assert _buySlopeDen > 0, "INVALID_SLOPE_DEM"
  assert convert(_buySlopeNum, decimal) / convert(_buySlopeDen, decimal) <= 1.0, "INVALID_SLOPE"
  self.buySlopeNum = _buySlopeNum
  self.buySlopeDen = _buySlopeDen
  assert _investmentReserveNum > 0, "INVALID_RESERVE_NUM"
  assert _investmentReserveDen > 0, "INVALID_RESERVE_DEN"
  assert convert(_investmentReserveNum, decimal) / convert(_investmentReserveDen, decimal) <= 1.0, "INVALID_RESERVE"
  self.investmentReserveNum = _investmentReserveNum
  self.investmentReserveDen = _investmentReserveDen
  assert _revenueCommitmentNum > 0, "INVALID_COMMITMENT_NUM"
  assert _revenueCommitmentDen > 0, "INVALID_COMMITMENT_DEN"
  assert convert(_revenueCommitmentNum, decimal) / convert(_revenueCommitmentDen, decimal) <= 1.0, "INVALID_COMMITMENT"
  self.revenueCommitmentNum = _revenueCommitmentNum
  self.revenueCommitmentDen = _revenueCommitmentDen

  self.burnThresholdNum = 1
  self.burnThresholdDen = 1
  self.feeDen = 1
  self.minInvestment = as_unitless_number(as_wei_value(100, "ether"))

  self.control = msg.sender
  self.beneficiary = msg.sender
  self.feeCollector = msg.sender

  # Register supported interfaces
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC20Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777Token"), self)
  self.ERC1820Registry.setInterfaceImplementer(self, keccak256("ERC777TokensRecipient"), self)

  # Mint the initial reserve
  self.initReserve = _initReserve
  self.totalSupply = self.initReserve
  self.balanceOf[self.beneficiary] = self.initReserve
  log.Transfer(ZERO_ADDRESS, self.beneficiary, self.initReserve)
  emptyData: bytes[256] = ""
  log.Minted(msg.sender, msg.sender, self.initReserve, emptyData, emptyData)
  # TODO call tokenReceived(?)

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
  # Note: no authorization required to burn tokens

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
    self.authorization.authorizeTransfer(_operator, _from, _to, _amount)

  self._callTokensToSend(_operator, _from, _to, _amount) # TODO _userData _operatorData stack underflow
  self.balanceOf[_from] -= _amount
  self.balanceOf[_to] += _amount
  self._callTokensReceived(_operator, _from, _to, _amount, _requireReceptionAck) # TODO _userData _operatorData stack underflow

  log.Sent(_operator, _from, _to, _amount, _userData, _operatorData)
  log.Transfer(_from, _to, _amount)

@private
def _collectInvestment(
  _from: address,
  _quantityToInvest: uint256,
  _msgValue: uint256(wei)
):
  # Collect investment
  if(self.currency == ZERO_ADDRESS):
    assert as_wei_value(_quantityToInvest, "wei") == _msgValue, "INCORRECT_MSG_VALUE"
  else:
    # TODO support ERC-777 currency?
    assert _msgValue == 0, "DO_NOT_SEND_ETH"
    balanceBefore: uint256 = self.currency.balanceOf(self)
    self.currency.transferFrom(_from, self, as_unitless_number(_quantityToInvest))
    assert self.currency.balanceOf(self) > balanceBefore, "ERC20_TRANSFER_FAILED"

@private
def _sendCurrency(
  _to: address,
  _amount: uint256
):
  if(self.currency == ZERO_ADDRESS):
    send(_to, as_wei_value(_amount, "wei"))
  else:
    balanceBefore: uint256 = self.currency.balanceOf(self)
    self.currency.transferFrom(self, _to, as_unitless_number(_amount))
    assert self.currency.balanceOf(self) > balanceBefore, "ERC20_TRANSFER_FAILED"

@private
def _distributeInvestment(
  _value: uint256
):
  reserve: uint256 = _value * (self.investmentReserveDen - self.investmentReserveNum) / self.investmentReserveDen
  fee: uint256 = reserve * self.feeNum / self.feeDen
  self._sendCurrency(self.feeCollector, fee)
  self._sendCurrency(self.beneficiary, reserve - fee)
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
  return _operator == _tokenHolder or self.operators[_tokenHolder][_operator]

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
  There are no empty lists in Vyper, so returning [ZERO_ADDRESS] instead.
  """
  return [ZERO_ADDRESS]

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

#region Functions for DAT business logic
##################################################

@public
@constant
def availableBalanceOf(
  _from: address
) -> uint256:
  if(self.state == STATE_INITIALIZATION):
    return 0
  elif(self.authorization != ZERO_ADDRESS):
    return self.authorization.availableBalanceOf(_from)
  else:
    return self.balanceOf[_from]

@public
@constant
def buybackReserve() -> uint256:
  reserve: uint256
  if(self.currency == ZERO_ADDRESS):
    reserve = as_unitless_number(self.balance)
  else:
    reserve = self.currency.balanceOf(self)
  return reserve

@public
@constant
def sellSlope() -> (uint256, uint256):
  return (
    as_unitless_number(2 * self.buybackReserve()),
    (self.totalSupply + self.burnedSupply) ** 2
  )

@public
@constant
def estimateTokensForBuy(
  _currencyValue: uint256
) -> uint256:
  if(self.state == STATE_INITIALIZATION):
    if(self.initDeadline == 0 or self.initDeadline > block.timestamp):
      return convert(
      	convert(2 * _currencyValue * self.buySlopeDen, decimal) / convert(self.initGoal * self.buySlopeNum, decimal),
      uint256)
  elif(self.state == STATE_RUNNING):
    unitConversion: uint256 = 1
    return convert(sqrt(
      convert(2 * _currencyValue * self.buySlopeDen, decimal)
      / convert(self.buySlopeNum * unitConversion, decimal)
      + convert(self.totalSupply + self.burnedSupply, decimal)
    ), uint256) - self.totalSupply - self.burnedSupply

  return 0

# @public
#@constant
#def estimateSellValue(
#  _quantityToSell: uint256
#) -> uint256:
#  if(self.state == STATE_RUNNING):
#    sellSlopeNum: uint256
#    sellSlopeDen: uint256
#    (sellSlopeNum, sellSlopeDen) = self.sellSlope()
#    return convert(
#      convert(_quantityToSell * sellSlopeNum * (self.burnedSupply ** 2 + 2 * self.burnedSupply * self.totalSupply + 2 * self.totalSupply ** 2 - _quantityToSell * self.totalSupply), decimal)
#      / convert(2 * sellSlopeDen * self.totalSupply, decimal)
#   , uint256)
#  else:
#    if(self.state == STATE_INITIALIZATION):
#      assert self.initInvestors[msg.sender] >= _quantityToSell, "INSUFFICIENT_BALANCE"
#      return convert(convert(_quantityToSell * self.buybackReserve(), decimal) / convert(self.totalSupply - self.initReserve, decimal), uint256)
#    else:
#      return convert(convert(_quantityToSell * self.buybackReserve(), decimal) / convert(self.totalSupply, decimal), uint256)

@public
@payable
def buy(
  _to: address,
  _quantityToInvest: uint256,
  _minTokensBought: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _quantityToInvest >= self.minInvestment, "SEND_AT_LEAST_MIN_INVESTMENT"

  tokenValue: uint256 = self.estimateTokensForBuy(_quantityToInvest)

  assert tokenValue > 0, "NOT_ENOUGH_FUNDS_OR_DEADLINE_PASSED"
  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(msg.sender, ZERO_ADDRESS, _to, tokenValue)

  self._collectInvestment(msg.sender, _quantityToInvest, msg.value)

  if(self.state == STATE_INITIALIZATION):
    self.initInvestors[_to] += tokenValue

    if(self.totalSupply - self.initReserve >= self.initGoal):
      self.state = STATE_RUNNING
      self._distributeInvestment(self.buybackReserve())
  elif(self.state == STATE_RUNNING):
    assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"

    if(_to == self.beneficiary):
      # TODO move this to a method, share with `pay`
      burnThreshold: decimal = convert(self.burnThresholdNum, decimal) / convert(self.burnThresholdDen, decimal)
      if(
        convert(tokenValue + self.balanceOf[_to], decimal)
        / convert(self.totalSupply + self.burnedSupply, decimal)
        > burnThreshold
      ):
        self.burn(tokenValue + self.balanceOf[_to] - convert(
          burnThreshold * convert(self.totalSupply + self.burnedSupply, decimal),
          uint256
        ), _userData)
    else:
      self._distributeInvestment(_quantityToInvest)
  else:
    assert False, "INVALID_STATE"

  # Mint new FSE
  self.totalSupply += tokenValue
  self.balanceOf[_to] += tokenValue
  self._callTokensReceived(msg.sender, ZERO_ADDRESS, _to, tokenValue, True) # TODO _userData, _operatorData causes `stack underflow`
  log.Transfer(ZERO_ADDRESS, _to, tokenValue)
  log.Minted(msg.sender, _to, tokenValue, _userData, _operatorData)

#@public
#def sell(
#  _amount: uint256,
#  _minCurrencyReturned: uint256,
#  _userData: bytes[256]
#):
#  if(self.authorization != ZERO_ADDRESS):
#    self.authorization.authorizeTransfer(msg.sender, msg.sender, ZERO_ADDRESS, _amount)

#  currencyValue: uint256 = self.estimateSellValue(_amount)
#  assert currencyValue > 0, "INSUFFICIENT_FUNDS"

#  if(self.state == STATE_INITIALIZATION):
#    pass # TODO
#  elif(self.state == STATE_RUNNING):
#    pass # TODO
#  else: # STATE_CLOSING
#    pass # TODO

#  assert tokenValue > 0, "NOT_ENOUGH_FUNDS"

  # TODO send currency
#  self._burn(msg.sender, msg.sender, _amount) # TODO _userData, ""

# TODO add operator buy/sell?

@public
def pay():
  # TODO
  pass

@public
@payable
def __default__():
  # TODO
  pass

@public
def tokensReceived(
    _operator: address,
    _from: address,
    _to: address,
    _amount: uint256,
    _userData: bytes[256],
    _operatorData: bytes[256]
  ):
  # TODO
  pass

#endregion

#region Function to update DAT configuration
##################################################

@public
def updateConfig(
  _authorizationAddress: address,
  _beneficiary: address,
  _control: address,
  _feeCollector: address,
  _feeNum: uint256,
  _feeDen: uint256,
  _burnThresholdNum: uint256,
  _burnThresholdDen: uint256,
  _minInvestment: uint256,
  _name: string[64],
  _symbol: string[32]
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  self.fse.updateConfig(_authorizationAddress, _name, _symbol);

  assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"
  # TODO move the token balance(?)
  self.beneficiary = _beneficiary

  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.control = _control

  assert _feeCollector != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.feeCollector = _feeCollector

  assert convert(_burnThresholdNum, decimal) / convert(_burnThresholdDen, decimal) <= 1.0, "INVALID_THRESHOLD"
  self.burnThresholdNum = _burnThresholdNum
  self.burnThresholdDen = _burnThresholdDen

  assert _feeDen > 0, "INVALID_FEE_DEM"
  assert convert(_feeNum, decimal) / convert(_feeDen, decimal) <= 1.0, "INVALID_FEE"
  self.feeNum = _feeNum
  self.feeDen = _feeDen

  assert _minInvestment > 0, "INVALID_MIN_INVESTMENT"
  self.minInvestment = _minInvestment

  log.UpdateConfig(_authorizationAddress, _beneficiary, _control, _feeCollector, _burnThresholdNum, _burnThresholdDen, _feeNum, _feeDen, _minInvestment, _name, _symbol)
#endregion
