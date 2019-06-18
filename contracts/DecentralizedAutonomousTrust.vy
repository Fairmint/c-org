# Decentralized Autonomous Trust

#region Types
##################################################

units: {
  FSE: "Fair Synthetic Equity",
  currencyTokens: "The reserve currency - either ETH or an ERC20",
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
    _value: uint256(FSE)
  ): modifying
  def availableBalanceOf(
    _from: address
  ) -> uint256(FSE): constant
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
    _amount: uint256(FSE),
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying
contract IERC777Sender:
  def tokensToSend(
    _operator: address,
    _from: address,
    _to: address,
    _amount: uint256(FSE),
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying

implements: ERC20
#TODO why does this fail? implements: IERC777Recipient

# Events required by the ERC-20 token standard
Approval: event({
  _owner: indexed(address),
  _spender: indexed(address),
  _value: uint256(FSE)
})
Transfer: event({
  _from: indexed(address),
  _to: indexed(address),
  _value: uint256(FSE)
})

# Events required by the ERC-777 token standard
AuthorizedOperator: event({
  _operator: indexed(address),
  _tokenHolder: indexed(address)
})
Burned: event({
  _operator: indexed(address),
  _from: indexed(address),
  _amount: uint256(FSE),
  _userData: bytes[256],
  _operatorData: bytes[256]
})
Minted: event({
  _operator: indexed(address),
  _to: indexed(address),
  _amount: uint256(FSE),
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
  _amount: uint256(FSE),
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
  _minInvestment: uint256(currencyTokens),
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
burnedSupply: public(uint256(FSE))
burnThresholdNum: public(uint256)
burnThresholdDen: public(uint256)
buySlopeNum: public(uint256(currencyTokens))
buySlopeDen: public(uint256(FSE * FSE))
control: public(address)
currencyAddress: public(address)
currency: ERC20 # redundant w/ currencyAddress, for convenience
feeCollector: public(address)
feeNum: public(uint256)
feeDen: public(uint256)
initDeadline: public(timestamp)
initGoal: public(uint256(FSE))
initInvestors: public(map(address, uint256(currencyTokens)))
initReserve: public(uint256(FSE))
investmentReserveNum: public(uint256)
investmentReserveDen: public(uint256)
minInvestment: public(uint256(currencyTokens))
revenueCommitmentNum: public(uint256)
revenueCommitmentDen: public(uint256)
state: public(uint256(stateMachine))

# Data storage required by the ERC-20 token standard
allowances: map(address, map(address, uint256(FSE))) # not public: exposed via `allowance`
balanceOf: public(map(address, uint256(FSE)))
# @notice Returns the account balance of another account with address _owner.

totalSupply: public(uint256(FSE))

# Metadata suggested by the ERC-20 token standard
name: public(string[64])
# @notice Returns the name of the token - e.g. "MyToken".
# @dev Optional requirement from ERC-20 and ERC-777.

symbol: public(string[32])
# @notice Returns the symbol of the token. E.g. “HIX”.
# @dev Optional requirement from ERC-20 and ERC-777

# Data storage required by the ERC-777 token standard
ERC1820Registry: IERC1820Registry # not public: constant data
operators: map(address, map(address, bool)) # not public: exposed via `isOperatorFor`
#endregion

#region Constructor
##################################################

@public
def __init__(
  _initReserve: uint256(FSE),
  _currencyAddress: address,
  _initGoal: uint256(FSE),
  _initDeadline: timestamp,
  _buySlopeNum: uint256(currencyTokens),
  _buySlopeDen: uint256(FSE ** 2),
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
  assert _buySlopeNum / _buySlopeDen <= 1, "INVALID_SLOPE"
  self.buySlopeNum = _buySlopeNum
  self.buySlopeDen = _buySlopeDen
  assert _investmentReserveNum > 0, "INVALID_RESERVE_NUM"
  assert _investmentReserveDen > 0, "INVALID_RESERVE_DEN"
  assert _investmentReserveNum / _investmentReserveDen <= 1, "INVALID_RESERVE"
  self.investmentReserveNum = _investmentReserveNum
  self.investmentReserveDen = _investmentReserveDen
  assert _revenueCommitmentNum > 0, "INVALID_COMMITMENT_NUM"
  assert _revenueCommitmentDen > 0, "INVALID_COMMITMENT_DEN"
  assert _revenueCommitmentNum / _revenueCommitmentDen <= 1, "INVALID_COMMITMENT"
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
  # TODO call tokenSender

#endregion

#region Private helper functions
##################################################

@private
def _callTokensToSend(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256(FSE),
  _userData: bytes[256],
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
  _amount: uint256(FSE),
  _requireReceptionAck: bool,
  _userData: bytes[256],
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
  _amount: uint256(FSE),
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert _from != ZERO_ADDRESS, "ERC777: burn from the zero address"
  # Note: no authorization required to burn tokens

  self._callTokensToSend(_operator, _from, ZERO_ADDRESS, _amount, _userData, _operatorData)
  self.totalSupply -= _amount
  self.balanceOf[_from] -= _amount
  log.Burned(_operator, _from, _amount, _userData, _operatorData)
  log.Transfer(_from, ZERO_ADDRESS, _amount)

@private
def _send(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256(FSE),
  _requireReceptionAck: bool,
  _userData: bytes[256],
  _operatorData: bytes[256]=""
):
  assert _from != ZERO_ADDRESS, "ERC777: send from the zero address"
  assert _to != ZERO_ADDRESS, "ERC777: send to the zero address"
  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(_operator, _from, _to, _amount)

  self._callTokensToSend(_operator, _from, _to, _amount, _userData) # TODO _operatorData stack underflow
  self.balanceOf[_from] -= _amount
  self.balanceOf[_to] += _amount
  self._callTokensReceived(_operator, _from, _to, _amount, _requireReceptionAck, _userData) # TODO _operatorData stake underflow

  log.Sent(_operator, _from, _to, _amount, _userData, _operatorData)
  log.Transfer(_from, _to, _amount)

@private
def _collectInvestment(
  _from: address,
  _quantityToInvest: uint256(currencyTokens),
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
  _amount: uint256(currencyTokens)
):
  if(self.currency == ZERO_ADDRESS):
    send(_to, as_wei_value(_amount, "wei"))
  else:
    balanceBefore: uint256 = self.currency.balanceOf(self)
    self.currency.transferFrom(self, _to, as_unitless_number(_amount))
    assert self.currency.balanceOf(self) > balanceBefore, "ERC20_TRANSFER_FAILED"

@private
def _distributeInvestment(
  _value: uint256(currencyTokens)
):
  reserve: uint256(currencyTokens) = _value * (self.investmentReserveDen - self.investmentReserveNum) / self.investmentReserveDen
  fee: uint256(currencyTokens) = reserve * self.feeNum / self.feeDen
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
) -> uint256(FSE):
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
  _value: uint256(FSE)
) -> bool:
  self.allowances[msg.sender][_spender] = _value
  log.Approval(msg.sender, _spender, _value)
  return True

@public
def transfer(
  _to: address,
  _value: uint256(FSE)
) -> bool:
  self._send(msg.sender, msg.sender, _to, _value, False)
  return True

@public
def transferFrom(
  _from: address,
  _to: address,
  _value: uint256(FSE)
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
  _amount: uint256(FSE),
  _userData: bytes[256]
):
  self._burn(msg.sender, msg.sender, _amount, _userData, "")
  self.burnedSupply += _amount

@public
def operatorBurn(
  _account: address,
  _amount: uint256(FSE),
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert self.isOperatorFor(msg.sender, _account), "ERC777: caller is not an operator for holder"
  self._burn(msg.sender, _account, _amount, _userData, _operatorData)

@public
def operatorSend(
  _sender: address,
  _recipient: address,
  _amount: uint256(FSE),
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
  _amount: uint256(FSE),
  _userData: bytes[256]=""
):
  self._send(msg.sender, msg.sender, _recipient, _amount, True, _userData)
#endregion

#region Functions for DAT business logic
##################################################

@public
@constant
def availableBalanceOf(
  _from: address
) -> uint256(FSE):
  if(self.state == STATE_INITIALIZATION):
    return 0
  elif(self.authorization != ZERO_ADDRESS):
    return self.authorization.availableBalanceOf(_from)
  else:
    return self.balanceOf[_from]

@public
@constant
def buybackReserve() -> uint256(currencyTokens):
  reserve: uint256(currencyTokens)
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
    (self.totalSupply + self.burnedSupply - self.initReserve) ** 2
  )

@public
@constant
def supplySold() -> uint256(FSE):
  return self.totalSupply + self.burnedSupply - self.initReserve

@public
@constant
def estimateTokensForBuy(
  _quantityToInvest: uint256(currencyTokens)
) -> uint256(FSE):
  if(self.state == STATE_INITIALIZATION):
    if(self.initDeadline == 0 or self.initDeadline < block.timestamp):
      return 2 * _quantityToInvest * self.buySlopeDen / (self.initGoal * self.buySlopeNum)
  elif(self.state == STATE_RUNNING):
    sellSlopeNum: uint256
    sellSlopeDen: uint256
    (sellSlopeNum, sellSlopeDen) = self.sellSlope()
    return convert(
      sqrt(
        convert(2 * _quantityToInvest * sellSlopeNum, decimal)
        / convert(sellSlopeDen, decimal)
        + convert(self.supplySold() ** 2, decimal)
      ), uint256) - self.supplySold()

  return 0

@public
@constant
def estimateTokensForSell(
  _quantityToSell: uint256(FSE)
) -> uint256(currencyTokens):
  # TODO
  return 1

@public
@payable
def buy(
  _quantityToInvest: uint256(currencyTokens),
  _minTokensBought: uint256(FSE),
  _userData: bytes[256]
):
  assert _quantityToInvest >= self.minInvestment, "SEND_AT_LEAST_MIN_INVESTMENT"

  tokenValue: uint256(FSE) = self.estimateTokensForBuy(_quantityToInvest)

  assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"
  assert tokenValue > 0, "NOT_ENOUGH_FUNDS"
  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(msg.sender, ZERO_ADDRESS, msg.sender, tokenValue)

  self._collectInvestment(msg.sender, _quantityToInvest, msg.value)

  if(self.state == STATE_INITIALIZATION):
    assert self.initDeadline == 0 or self.initDeadline < block.timestamp, "DEADLINE_PASSED"

    self.initInvestors[msg.sender] += _quantityToInvest

    if(self.supplySold() >= self.initGoal):
      self.state = STATE_RUNNING
      self._distributeInvestment(self.buybackReserve())
  elif(self.state == STATE_RUNNING):
    if(msg.sender == self.beneficiary):
      burnThreshold: decimal = convert(self.burnThresholdNum, decimal) / convert(self.burnThresholdDen, decimal)
      if(
        convert(tokenValue + self.balanceOf[msg.sender], decimal)
        / convert(self.totalSupply + self.burnedSupply, decimal)
        > burnThreshold
      ):
        self.burn(tokenValue + self.balanceOf[msg.sender] - convert(
          burnThreshold * convert(self.totalSupply + self.burnedSupply, decimal),
          uint256
        ), _userData)
    else:
      self._distributeInvestment(_quantityToInvest)
  else:
    assert False, "INVALID_STATE"

  # Mint new FSE
  self.totalSupply += tokenValue
  self.balanceOf[msg.sender] += tokenValue
  self._callTokensReceived(msg.sender, ZERO_ADDRESS, msg.sender, tokenValue, True) # TODO _userData causes `stack underflow`
  log.Transfer(ZERO_ADDRESS, msg.sender, tokenValue)
  emptyData: bytes[256] = ""
  log.Minted(msg.sender, msg.sender, tokenValue, _userData, emptyData)

@public
def sell(
  _amount: uint256(FSE),
  _minCurrencyReturned: uint256(currencyTokens),
  _userData: bytes[256]
):
  if(self.authorization != ZERO_ADDRESS):
    self.authorization.authorizeTransfer(msg.sender, msg.sender, ZERO_ADDRESS, _amount)

  if(self.state == STATE_INITIALIZATION):
    pass # TODO
  elif(self.state == STATE_RUNNING):
    pass # TODO
  else: # STATE_CLOSING
    pass # TODO

  # TODO send currency
  self._burn(msg.sender, msg.sender, _amount, _userData, "")

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
    _amount: uint256(FSE),
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
  _minInvestment: uint256(currencyTokens),
  _name: string[64],
  _symbol: string[32]
):
  assert msg.sender == self.control, "CONTROL_ONLY"

  self.authorizationAddress = _authorizationAddress
  self.authorization = IAuthorization(_authorizationAddress)

  assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.beneficiary = _beneficiary

  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.control = _control

  assert _feeCollector != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.feeCollector = _feeCollector

  burnThreshold: decimal = convert(_burnThresholdNum, decimal) / convert(_burnThresholdDen, decimal)
  assert burnThreshold <= convert(1, decimal), "INVALID_THRESHOLD"
  self.burnThresholdNum = _burnThresholdNum
  self.burnThresholdDen = _burnThresholdDen

  assert _feeDen > 0, "INVALID_FEE_DEM"
  assert _feeNum / _feeDen <= 1, "INVALID_FEE"
  self.feeNum = _feeNum
  self.feeDen = _feeDen

  assert _minInvestment > 0, "INVALID_MIN_INVESTMENT"
  self.minInvestment = _minInvestment

  self.name = _name

  self.symbol = _symbol

  log.UpdateConfig(_authorizationAddress, _beneficiary, _control, _feeCollector, _burnThresholdNum, _burnThresholdDen, _feeNum, _feeDen, _minInvestment, _name, _symbol)
#endregion
