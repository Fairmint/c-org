# Decentralized Autonomous Trust

#region Types
##################################################

units: {
  stateMachine: "The DAT's internal state machine"
}

from vyper.interfaces import ERC20

# TODO: switch to interface files (currently non-native imports fail to compile)
# Depends on https://github.com/ethereum/vyper/issues/1367
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
contract IFSE:
  def burnedSupply() -> uint256: constant
  def totalSupply() -> uint256: constant
  def balanceOf(
    _account: address
  ) -> uint256: constant
  def initialize(): modifying
  def burn(
    _amount: uint256,
    _userData: bytes[256]
  ): modifying
  def operatorBurn(
    _account: address,
    _amount: uint256,
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying
  def mint(
    _operator: address,
    _to: address,
    _quantity: uint256,
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying
  def updateConfig(
    _authorizationAddress: address,
    _name: string[64],
    _symbol: string[32]
  ): modifying

#TODO why does this fail? implements: IERC777Recipient

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
STATE_INIT: constant(uint256(stateMachine)) = 0
STATE_RUN: constant(uint256(stateMachine)) = 1
STATE_CLOSE: constant(uint256(stateMachine)) = 2
STATE_CANCEL: constant(uint256(stateMachine)) = 3

# Data for DAT business logic
beneficiary: public(address)
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
fseAddress: public(address)
fse: IFSE # redundant w/ fseAddress, for convenience
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
  _fseAddress: address,
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
  self.currencyAddress = _currencyAddress
  self.currency = ERC20(_currencyAddress)

  # Set initGoal, which in turn defines the initial state
  if(_initGoal == 0):
    self.state = STATE_RUN
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
  # address is constant for all networks
  IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24).setInterfaceImplementer(self, keccak256("ERC777TokensRecipient"), self)

  # Mint the initial reserve
  self.initReserve = _initReserve
  self.fseAddress = _fseAddress
  self.fse = IFSE(_fseAddress)
  self.fse.initialize()
  self.fse.mint(msg.sender, self.beneficiary, self.initReserve, "", "")

#endregion

#region Private helper functions
##################################################

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

#region Functions for DAT business logic
##################################################

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
    (self.fse.totalSupply() + self.fse.burnedSupply()) ** 2
  )

@public
@payable
def buy(
  _to: address,
  _currencyValue: uint256,
  _minTokensBought: uint256
):
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _currencyValue >= self.minInvestment, "SEND_AT_LEAST_MIN_INVESTMENT"

  tokenValue: uint256

  self._collectInvestment(msg.sender, _currencyValue, msg.value)

  if(self.state == STATE_INIT):
    if(self.initDeadline == 0 or self.initDeadline > block.timestamp):
      tokenValue = convert(
      	convert(2 * _currencyValue * self.buySlopeDen, decimal) / convert(self.initGoal * self.buySlopeNum, decimal),
      uint256)
    self.initInvestors[_to] += tokenValue

    if(self.fse.totalSupply() - self.initReserve >= self.initGoal):
      self.state = STATE_RUN
      self._distributeInvestment(self.buybackReserve())
  elif(self.state == STATE_RUN):
    unitConversion: uint256 = 1
    tokenValue = convert(sqrt(
      convert(2 * _currencyValue * self.buySlopeDen, decimal)
      / convert(self.buySlopeNum * unitConversion, decimal)
      + convert(self.fse.totalSupply() + self.fse.burnedSupply(), decimal)
    ), uint256) - self.fse.totalSupply() - self.fse.burnedSupply()
    assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"

    if(_to == self.beneficiary):
      # TODO move this to a method, share with `pay`
      burnThreshold: decimal = convert(self.burnThresholdNum, decimal) / convert(self.burnThresholdDen, decimal)
      if(
        convert(tokenValue + self.fse.balanceOf(_to), decimal)
        / convert(self.fse.totalSupply() + self.fse.burnedSupply(), decimal)
        > burnThreshold
      ):
        self.fse.burn(tokenValue + self.fse.balanceOf(_to) - convert(
          burnThreshold * convert(self.fse.totalSupply() + self.fse.burnedSupply(), decimal),
          uint256
        ), "")
    else:
      self._distributeInvestment(_currencyValue)
  else:
    assert False, "INVALID_STATE"

  assert tokenValue > 0, "NOT_ENOUGH_FUNDS_OR_DEADLINE_PASSED"
  self.fse.mint(msg.sender, _to, tokenValue, "", "")

@public
def sell(
 _quantityToSell: uint256,
 _minCurrencyReturned: uint256
):
  totalSupply: uint256 = self.fse.totalSupply()
  currencyValue: uint256

  if(self.state == STATE_RUN):
    burnedSupply: uint256 = self.fse.burnedSupply()
    sellSlopeNum: uint256
    sellSlopeDen: uint256
    (sellSlopeNum, sellSlopeDen) = self.sellSlope()
    currencyValue = burnedSupply ** 2
    currencyValue += 2 * burnedSupply * totalSupply
    currencyValue += 2 * totalSupply ** 2
    currencyValue -= _quantityToSell * totalSupply
    currencyValue *= _quantityToSell * sellSlopeNum
    currencyValue /= 2 * sellSlopeDen * totalSupply
  elif(self.state == STATE_CLOSE):
    currencyValue = _quantityToSell * self.buybackReserve() / totalSupply
  else:
    self.initInvestors[msg.sender] -= _quantityToSell
    currencyValue = _quantityToSell * self.buybackReserve() / (totalSupply - self.initReserve)

  assert currencyValue > 0, "INSUFFICIENT_FUNDS"

  self._sendCurrency(msg.sender, currencyValue)
  self.fse.operatorBurn(msg.sender, _quantityToSell, "", "")

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

  self.fse.updateConfig(_authorizationAddress, _name, _symbol)

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
