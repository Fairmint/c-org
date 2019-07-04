# Decentralized Autonomous Trust

#region Types
##################################################

from vyper.interfaces import ERC20

units: {
  stateMachine: "The DAT's internal state machine"
}

# TODO: switch to interface files
# Depends on https://github.com/ethereum/vyper/issues/1367
contract IERC1820Registry:
  # @title Used to register support for the ERC-777 receiver hook.
  def setInterfaceImplementer(
    _account: address,
    _interfaceHash: bytes32,
    _implementer: address
  ): modifying
  def getInterfaceImplementer(
    _addr: address,
    _interfaceHash: bytes32
  ) -> address: constant
contract IERC777_20_Token:
  # @title Represents either an ERC-777 or an ERC-20 token.
  def totalSupply() -> uint256: constant
  def balanceOf(
    _account: address
  ) -> uint256: constant
  def transfer(
    _to: address,
    _value: uint256
  ) -> bool: modifying
  def transferFrom(
    _from: address,
    _to: address,
    _value: uint256
  ) -> bool: modifying
  def send(
    _recipient: address,
    _amount: uint256,
    _userData: bytes[256]
  ): modifying
  def operatorSend(
    _sender: address,
    _recipient: address,
    _amount: uint256,
    _userData: bytes[256],
    _operatorData: bytes[256]
  ): modifying
contract IFAIR:
  # @title The interface for our FAIR tokens.
  def burnedSupply() -> uint256: constant
  def totalSupply() -> uint256: constant
  def balanceOf(
    _account: address
  ) -> uint256: constant
  def initialize(): modifying
  def authorizationAddress() -> address: constant
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
  def operatorSend(
    _sender: address,
    _recipient: address,
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
contract IAuthorization:
  # @title The interface for the authorization contract used by our FAIR token.
  def isTransferAllowed(
    _operator: address,
    _from: address,
    _to: address,
    _value: uint256,
    _operatorData: bytes[256]
  ) -> bool: constant

# Events
###########

Buy: event({
  _from: address,
  _to: address,
  _currencyValue: uint256,
  _fairValue: uint256
})
Sell: event({
  _from: address,
  _currencyValue: uint256,
  _fairValue: uint256
})
Pay: event({
  _from: address,
  _to: address,
  _currencyValue: uint256,
  _fairValue: uint256
})
Close: event({
  _exitFee: uint256
})
StateChange: event({
  _previousState: uint256,
  _newState: uint256
})
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
###########

STATE_INIT: constant(uint256(stateMachine)) = 0
# @notice The default state

STATE_RUN: constant(uint256(stateMachine)) = 1
# @notice The state after initGoal has been reached

STATE_CLOSE: constant(uint256(stateMachine)) = 2
# @notice The state after closed by the `beneficiary` account from STATE_RUN

STATE_CANCEL: constant(uint256(stateMachine)) = 3
# @notice The state after closed by the `beneficiary` account from STATE_INIT

# TODO rename these:

DIGITS_ROUND_UINT: constant(uint256) = 10 ** 8
# @dev Used to avoid overflow errors

DIGITS_UINT: constant(uint256) = 10 ** 18
# @notice Represents 1 full token (with 18 decimals)

DIGITS_DECIMAL: constant(decimal) = convert(DIGITS_UINT, decimal)
# @notice Represents 1 full token (with 18 decimals)

# Data for DAT business logic
###########

beneficiary: public(address)
# @notice The address of the beneficiary organization which receives the investments. 
# Points to the wallet of the organization. 

burnThresholdNum: public(uint256)
# @notice The percentage of the total supply of FSE above which the FSEs minted by the
# organization are automatically burnt.
# @dev This is the numerator component of the fractional value.

burnThresholdDen: public(uint256)
# @notice The percentage of the total supply of FSE above which the FSEs minted by the
# organmization are automatically burnt.
# @dev This is the denominator component of the fractional value.

buySlopeNum: public(uint256)
# @notice The buy slope of the bonding curve. 
# Does not affect the financial model, only the granularity of FSE.
# @dev This is the numerator component of the fractional value.

buySlopeDen: public(uint256)
# @notice The buy slope of the bonding curve. 
# Does not affect the financial model, only the granularity of FSE.
# @dev This is the denominator component of the fractional value.

control: public(address)
# @notice The address from which the updatable variables can be updated

currencyAddress: public(address)
# @notice The address of the token used as reserve in the bonding curve 
# (e.g. the DAI contract). Use ETH if 0.

currency: IERC777_20_Token 
# @notice The address of the token used as reserve in the bonding curve 
# (e.g. the DAI contract). Use ETH if 0.
# @dev redundant w/ currencyAddress, for convenience

feeCollector: public(address)
# @notice The address where fees are sent.

feeNum: public(uint256)
# @notice The percent fee collected each time new FSE are issued.
# @dev This is the numerator component of the fractional value.

feeDen: public(uint256)
# @notice The percent fee collected each time new FSE are issued.
# @dev This is the denominator component of the fractional value.

fairAddress: public(address)
# @notice The FAIR token contract address

fair: IFAIR 
# @notice The FAIR token contract address
# @dev redundant w/ fairAddress, for convenience

initGoal: public(uint256)
# @notice The initial fundraising goal (expressed in FSE) to start the c-org. 
# `0` means that there is no initial fundraising and the c-org immediately moves to run state.

initInvestors: public(map(address, uint256))
# @notice A map with all investors in init state using address as a key and amount as value. 
# @dev This structure's purpose is to make sure that only investors can withdraw their money if init_goal is not reached.

initReserve: public(uint256)
# @notice The initial number of FSE created at initialization for the beneficiary.
# @dev Most organizations will move these tokens into vesting contract(s)

investmentReserveNum: public(uint256)
# @notice The investment reserve of the c-org. Defines the percentage of the value invested that is 
# automatically funneled and held into the buyback_reserve.
# @dev This is the numerator component of the fractional value.

investmentReserveDen: public(uint256)
# @notice The investment reserve of the c-org. Defines the percentage of the value invested that is 
# automatically funneled and held into the buyback_reserve.
# @dev This is the denominator component of the fractional value.

isCurrencyERC20: public(bool)
# @notice A cache of the currency type, if `True` use ERC-20 otherwise use ETH or ERC-777.

minInvestment: public(uint256)
# @notice The minimum amount of `currency` investment accepted.

revenueCommitmentNum: public(uint256)
# @notice The revenue commitment of the organization. Defines the percentage of the value paid through the contract
# that is automatically funneled and held into the buyback_reserve.
# @dev This is the numerator component of the fractional value.

revenueCommitmentDen: public(uint256)
# @notice The revenue commitment of the organization. Defines the percentage of the value paid through the contract
# that is automatically funneled and held into the buyback_reserve.
# @dev This is the denominator component of the fractional value.

state: public(uint256(stateMachine))
# @notice The current state of the contract.
# @dev See the constants above for possible state values.

#endregion

#region Constructor
##################################################

# TODO switch to init pattern in order to support zos upgrades
@public
def __init__(
  _beneficiary: address,
  _fairAddress: address,
  _initReserve: uint256,
  _currencyAddress: address,
  _initGoal: uint256,
  _buySlopeNum: uint256,
  _buySlopeDen: uint256,
  _investmentReserveNum: uint256,
  _investmentReserveDen: uint256,
  _revenueCommitmentNum: uint256,
  _revenueCommitmentDen: uint256
):
  # Set initGoal, which in turn defines the initial state
  if(_initGoal == 0):
    self.state = STATE_RUN
  else:
    self.initGoal = _initGoal

  assert _buySlopeNum > 0, "INVALID_SLOPE_NUM" # 0 not supported
  assert _buySlopeDen > 0, "INVALID_SLOPE_DEN"
  self.buySlopeNum = _buySlopeNum # Fraction may be > 1
  self.buySlopeDen = _buySlopeDen
  assert _investmentReserveDen > 0, "INVALID_RESERVE_DEN"
  assert _investmentReserveNum <= _investmentReserveDen, "INVALID_RESERVE" # 100% or less
  self.investmentReserveNum = _investmentReserveNum # 0 means all investments go to the beneficiary
  self.investmentReserveDen = _investmentReserveDen
  assert _revenueCommitmentDen > 0, "INVALID_COMMITMENT_DEN"
  assert _revenueCommitmentNum <= _revenueCommitmentDen, "INVALID_COMMITMENT" # 100% or less
  self.revenueCommitmentNum = _revenueCommitmentNum # 0 means all renvue goes to the beneficiary
  self.revenueCommitmentDen = _revenueCommitmentDen

  self.burnThresholdNum = 1
  self.burnThresholdDen = 1
  self.feeDen = 1
  self.minInvestment = as_unitless_number(as_wei_value(100, "ether"))

  assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.beneficiary = _beneficiary

  self.control = msg.sender
  self.feeCollector = msg.sender

  # Register supported interfaces
  # the 1820 address is constant for all networks
  IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24).setInterfaceImplementer(self, keccak256("ERC777TokensRecipient"), self)

  self.currencyAddress = _currencyAddress
  implementer: address = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24).getInterfaceImplementer(_currencyAddress, keccak256("ERC777"))
  if(implementer == ZERO_ADDRESS):
    self.currency = IERC777_20_Token(_currencyAddress)
    self.isCurrencyERC20 = True
  else:
    self.currency = IERC777_20_Token(implementer)

  self.fairAddress = _fairAddress
  self.fair = IFAIR(_fairAddress)
  self.fair.initialize()

  if(_initReserve > 0):
    self.initReserve = _initReserve
    self.fair.mint(msg.sender, self.beneficiary, self.initReserve, "", "")

#endregion

#region Private helper functions
##################################################

@private
@constant
def _toDecimalWithPlaces(
  _value: uint256
) -> decimal:
  temp: uint256 = _value / DIGITS_UINT
  decimalValue: decimal = convert(_value - temp * DIGITS_UINT, decimal)
  decimalValue /= DIGITS_DECIMAL
  decimalValue += convert(temp, decimal)
  return decimalValue

@private
def _collectInvestment(
  _from: address,
  _quantityToInvest: uint256,
  _msgValue: uint256(wei),
  _refundRemainder: bool
):
  # Collect investment
  if(self.currency == ZERO_ADDRESS):
    if(_refundRemainder):
      send(_from, _msgValue - _quantityToInvest)
    else:
      assert as_wei_value(_quantityToInvest, "wei") == _msgValue, "INCORRECT_MSG_VALUE"
  else:
    assert _msgValue == 0, "DO_NOT_SEND_ETH"
    balanceBefore: uint256 = self.currency.balanceOf(self)

    if(self.isCurrencyERC20):
      self.currency.transferFrom(_from, self, as_unitless_number(_quantityToInvest))
    else:
      self.currency.operatorSend(_from, self, as_unitless_number(_quantityToInvest), "", "")
    
    assert self.currency.balanceOf(self) > balanceBefore, "TOKEN_TRANSFER_FAILED"

@private
def _applyBurnThreshold():
  balanceBefore: uint256 = self.fair.balanceOf(self.beneficiary)
  maxHoldings: uint256 = self.fair.totalSupply() + self.fair.burnedSupply()
  maxHoldings *= self.burnThresholdNum
  maxHoldings /= self.burnThresholdDen

  if(balanceBefore > maxHoldings):
    self.fair.operatorBurn(self.beneficiary, balanceBefore - maxHoldings, "", "")

@private
def _sendCurrency(
  _to: address,
  _amount: uint256
):
  if(_amount > 0):
    if(self.currency == ZERO_ADDRESS):
      send(_to, as_wei_value(_amount, "wei"))
    else:
      balanceBefore: uint256 = self.currency.balanceOf(_to)
      
      if(self.isCurrencyERC20):
        self.currency.transfer(_to, as_unitless_number(_amount))
      else:
        self.currency.send(_to, as_unitless_number(_amount), "")

      assert self.currency.balanceOf(_to) > balanceBefore, "ERC20_TRANSFER_FAILED"

@private
def _distributeInvestment(
  _value: uint256
):
  reserve: uint256 = self.investmentReserveNum * _value
  reserve /= self.investmentReserveDen
  reserve = _value - reserve
  fee: uint256 = reserve * self.feeNum
  fee /= self.feeDen
  self._sendCurrency(self.feeCollector, fee)
  self._sendCurrency(self.beneficiary, reserve - fee)

@private
def _pay(
  _operator: address,
  _to: address,
  _currencyValue: uint256
):
  assert self.state == STATE_RUN, "INVALID_STATE"
  self._sendCurrency(self.beneficiary, _currencyValue - _currencyValue * self.investmentReserveNum / self.investmentReserveDen)

  # buy_slope = n/d
  # revenue_commitment = c/g
  # sqrt(
  #  (2 a c d)
  #  /
  #  (g n)
  #  + s^2
  # ) - s

  supply: uint256 = self.fair.totalSupply() + self.fair.burnedSupply()
  tokenValue: uint256 = 2 * _currencyValue * self.revenueCommitmentNum * self.buySlopeDen
  tokenValue /= self.revenueCommitmentDen * self.buySlopeNum
  tokenValue += supply * supply
  # Max total tokenValue of 2**256 - 1 (else tx reverts)

  tokenValue /= DIGITS_UINT # Truncates last 18 digits from tokenValue here

  decimalValue: decimal = self._toDecimalWithPlaces(tokenValue) # Truncates another 8 digits from tokenValue (losing 26 digits in total)
  # Max total decimalValue of 2**127 - 1 (else tx reverts)

  decimalValue = sqrt(decimalValue)

  # Unshift results
  decimalValue *= DIGITS_DECIMAL
  # Max total decimalValue of 2**127 - 1 (else tx reverts)

  tokenValue = convert(decimalValue, uint256)

  tokenValue -= supply

  to: address = _to
  if(to == ZERO_ADDRESS):
    to = self.beneficiary
  elif(self.fair.authorizationAddress() != ZERO_ADDRESS):
    if(not IAuthorization(self.fair.authorizationAddress()).isTransferAllowed(self, ZERO_ADDRESS, _to, tokenValue, "")):
      to = self.beneficiary

  self.fair.mint(_operator, to, tokenValue, "", "")
  self._applyBurnThreshold() # must mint before this call

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
@payable
def buy(
  _to: address,
  _currencyValue: uint256,
  _minTokensBought: uint256
):
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _currencyValue >= self.minInvestment, "SEND_AT_LEAST_MIN_INVESTMENT"

  tokenValue: uint256

  self._collectInvestment(msg.sender, _currencyValue, msg.value, False)

  if(self.state == STATE_INIT):
    tokenValue = 2 * _currencyValue * self.buySlopeDen
    tokenValue /= self.initGoal * self.buySlopeNum
    self.fair.mint(msg.sender, _to, tokenValue, "", "")

    self.initInvestors[_to] += tokenValue

    if(self.fair.totalSupply() - self.initReserve >= self.initGoal):
      self.state = STATE_RUN
      self._distributeInvestment(self.buybackReserve())
  elif(self.state == STATE_RUN):
    supply: uint256 = self.fair.totalSupply() + self.fair.burnedSupply()
    tokenValue = 2 * _currencyValue
    tokenValue *= self.buySlopeDen
    tokenValue /= self.buySlopeNum
    tokenValue += supply * supply
    # Max total tokenValue of 2**256 - 1 (else tx reverts)

    tokenValue /= DIGITS_UINT # Truncates last 18 digits from tokenValue here

    decimalValue: decimal = self._toDecimalWithPlaces(tokenValue) # Truncates another 8 digits from tokenValue (losing 26 digits in total)
    # Max total decimalValue of 2**127 - 1 (else tx reverts)

    decimalValue = sqrt(decimalValue)

    # Unshift results
    decimalValue *= DIGITS_DECIMAL
    # Max total decimalValue of 2**127 - 1 (else tx reverts)

    tokenValue = convert(decimalValue, uint256)

    tokenValue -= supply

    assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"
    self.fair.mint(msg.sender, _to, tokenValue, "", "")

    if(_to == self.beneficiary):
      self._applyBurnThreshold() # must mint before this call
    else:
      self._distributeInvestment(_currencyValue)
  else:
    assert False, "INVALID_STATE"

  assert tokenValue > 0, "NOT_ENOUGH_FUNDS_OR_DEADLINE_PASSED"

@public
def sell(
 _quantityToSell: uint256,
 _minCurrencyReturned: uint256
):
  totalSupply: uint256 = self.fair.totalSupply()
  currencyValue: uint256

  if(self.state == STATE_RUN):
    # buyback_reserve = r
    # total_supply = t
    # burnt_supply = b
    # amount = a
    # source: (t+b)*a*(2*r)/((t+b)^2)-(((2*r)/((t+b)^2)*a^2)/2)+((2*r)/((t+b)^2)*a*b^2)/(2*(t)) 
    # imp: (a b^2 r)/(t (b + t)^2) + (2 a r)/(b + t) - (a^2 r)/(b + t)^2
    burnedSupply: uint256 = self.fair.burnedSupply()
    supply: uint256 = totalSupply + burnedSupply
    buybackReserve: uint256 = self.buybackReserve()
    quantityToSell: uint256 = _quantityToSell
    multiple: uint256 = 1
    if(supply + buybackReserve > 10000000 * DIGITS_UINT):
      multiple = DIGITS_ROUND_UINT
      burnedSupply /= multiple
      totalSupply /= multiple
      supply /= multiple
      buybackReserve /= multiple
    
    currencyValue = quantityToSell * buybackReserve
    currencyValue *= burnedSupply * burnedSupply
    currencyValue /= totalSupply * supply * supply
    temp: uint256 = 2 * quantityToSell * buybackReserve
    temp /= supply
    currencyValue += temp
    temp = quantityToSell * quantityToSell * buybackReserve
    temp /= supply * supply * multiple
    currencyValue -= temp
  elif(self.state == STATE_CLOSE):
    currencyValue = _quantityToSell * self.buybackReserve() 
    currencyValue /= totalSupply
  else:
    self.initInvestors[msg.sender] -= _quantityToSell
    currencyValue = _quantityToSell * self.buybackReserve()
    currencyValue /= totalSupply - self.initReserve

  assert currencyValue > 0, "INSUFFICIENT_FUNDS"

  self._sendCurrency(msg.sender, currencyValue)
  self.fair.operatorBurn(msg.sender, _quantityToSell, "", "")

@public
@payable
def pay(
  _to: address,
  _currencyValue: uint256
):
  self._collectInvestment(msg.sender, _currencyValue, msg.value, False)
  self._pay(msg.sender, _to, _currencyValue)

@public
@payable
def __default__():
  self._collectInvestment(msg.sender, as_unitless_number(msg.value), msg.value, False)
  self._pay(msg.sender, msg.sender, as_unitless_number(msg.value))

@public
def tokensReceived(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256,
  _userData: bytes[256],
  _operatorData: bytes[256]
):
  assert msg.sender == self.currency, "INVALID_CURRENCY"
  self._pay(msg.sender, _from, _amount)

@public
@payable
def close():
  assert msg.sender == self.beneficiary, "BENEFICIARY_ONLY"

  if(self.state == STATE_INIT):
    self.state = STATE_CANCEL
  elif(self.state == STATE_RUN):
    self.state = STATE_CLOSE
    supply: uint256 = self.fair.totalSupply()
    exitFee: uint256 = supply * supply
    exitFee *= self.buySlopeNum
    exitFee /= self.buySlopeDen * 2
    exitFee -= self.buybackReserve() - as_unitless_number(msg.value)
    self._collectInvestment(msg.sender, exitFee, msg.value, True)
  else:
    assert False, "INVALID_STATE"

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

  self.fair.updateConfig(_authorizationAddress, _name, _symbol)

  if(self.beneficiary != _beneficiary):
    assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"
    tokens: uint256 = self.fair.balanceOf(self.beneficiary)
    if(tokens > 0):
      self.fair.operatorSend(self.beneficiary, _beneficiary, self.fair.balanceOf(self.beneficiary), "", "")
      self.beneficiary = _beneficiary

  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.control = _control

  assert _feeCollector != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.feeCollector = _feeCollector

  assert _burnThresholdDen > 0, "INVALID_THRESHOLD_DEN"
  assert _burnThresholdNum <= _burnThresholdDen, "INVALID_THRESHOLD" # 100% or less
  self.burnThresholdNum = _burnThresholdNum # 0 means burn all of beneficiary's holdings
  self.burnThresholdDen = _burnThresholdDen

  assert _feeDen > 0, "INVALID_FEE_DEM"
  assert _feeNum <= _feeDen, "INVALID_FEE" # 100% or less
  self.feeNum = _feeNum # 0 means no fee
  self.feeDen = _feeDen

  assert _minInvestment > 0, "INVALID_MIN_INVESTMENT"
  self.minInvestment = _minInvestment

  log.UpdateConfig(_authorizationAddress, _beneficiary, _control, _feeCollector, _burnThresholdNum, _burnThresholdDen, _feeNum, _feeDen, _minInvestment, _name, _symbol)
#endregion
