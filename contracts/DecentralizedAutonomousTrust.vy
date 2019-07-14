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
    _userData: bytes[1024]
  ): modifying
  def operatorSend(
    _sender: address,
    _recipient: address,
    _amount: uint256,
    _userData: bytes[1024],
    _operatorData: bytes[1024]
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
    _userData: bytes[1024]
  ): modifying
  def operatorBurn(
    _account: address,
    _amount: uint256,
    _userData: bytes[1024],
    _operatorData: bytes[1024]
  ): modifying
  def operatorSend(
    _sender: address,
    _recipient: address,
    _amount: uint256,
    _userData: bytes[1024],
    _operatorData: bytes[1024]
  ): modifying
  def mint(
    _operator: address,
    _to: address,
    _quantity: uint256,
    _userData: bytes[1024],
    _operatorData: bytes[1024]
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
    _operatorData: bytes[1024]
  ) -> bool: constant
contract IBigDiv:
  def bigDiv2x2(
    _numA: uint256,
    _numB: uint256,
    _denA: uint256,
    _denB: uint256,
    _roundUp: bool
  ) -> uint256: constant
  def bigDiv3x3(
    _numA: uint256,
    _numB: uint256,
    _numC: uint256,
    _denA: uint256,
    _denB: uint256,
    _denC: uint256,
    _roundUp: bool
  ) -> uint256: constant

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
  _to: address,
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
  _previousState: uint256(stateMachine),
  _newState: uint256(stateMachine)
})
UpdateConfig: event({
  _authorizationAddress: address,
  _beneficiary: indexed(address),
  _control: indexed(address),
  _feeCollector: indexed(address),
  _burnThresholdBasisPoints: uint256,
  _feeBasisPoints: uint256,
  _minInvestment: uint256,
  _openUntilAtLeast: uint256,
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

MAX_BEFORE_SQUARE: constant(uint256)  = 340282366920938425684442744474606501888
# @notice When multiplying 2 terms, the max value is sqrt(2^256-1) 

DIGITS_UINT: constant(uint256) = 10 ** 18
# @notice Represents 1 full token (with 18 decimals)

DIGITS_DECIMAL: constant(decimal) = convert(DIGITS_UINT, decimal)
# @notice Represents 1 full token (with 18 decimals)

BASIS_POINTS_DEN: constant(uint256) = 10000
# @notice The denominator component for values specified in basis points.

# Data for DAT business logic
###########

_isTransferFrom: bool
# @dev An internal variable to differentiate between an ERC-777 transfer vs transferFrom

beneficiary: public(address)
# @notice The address of the beneficiary organization which receives the investments. 
# Points to the wallet of the organization. 

bigDivAddress: public(address)
# @notice The BigDiv library we use for BigNumber math

bigDiv: IBigDiv
# @notice The BigDiv library we use for BigNumber math
# @dev redundant w/ currencyAddress, for convenience

burnThresholdBasisPoints: public(uint256)
# @notice The percentage of the total supply of FAIR above which the FAIRs minted by the
# organization are automatically burnt expressed in basis points.

buySlopeNum: public(uint256)
# @notice The buy slope of the bonding curve. 
# Does not affect the financial model, only the granularity of FAIR.
# @dev This is the numerator component of the fractional value.

buySlopeDen: public(uint256)
# @notice The buy slope of the bonding curve. 
# Does not affect the financial model, only the granularity of FAIR.
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

feeBasisPoints: public(uint256)
# @notice The percent fee collected each time new FAIR are issued expressed in basis points.

fairAddress: public(address)
# @notice The FAIR token contract address

fair: IFAIR 
# @notice The FAIR token contract address
# @dev redundant w/ fairAddress, for convenience

initGoal: public(uint256)
# @notice The initial fundraising goal (expressed in FAIR) to start the c-org. 
# `0` means that there is no initial fundraising and the c-org immediately moves to run state.

initInvestors: public(map(address, uint256))
# @notice A map with all investors in init state using address as a key and amount as value. 
# @dev This structure's purpose is to make sure that only investors can withdraw their money if init_goal is not reached.

initReserve: public(uint256)
# @notice The initial number of FAIR created at initialization for the beneficiary.
# @dev Most organizations will move these tokens into vesting contract(s)

investmentReserveBasisPoints: public(uint256)
# @notice The investment reserve of the c-org. Defines the percentage of the value invested that is 
# automatically funneled and held into the buyback_reserve expressed in basis points.

isCurrencyERC20: public(bool)
# @notice A cache of the currency type, if `True` use ERC-20 otherwise use ETH or ERC-777.

openUntilAtLeast: public(uint256)
# @notice The earliest date/time (in seconds) that the DAT may enter the `CLOSE` state, ensuring
# that if the DAT reaches the `RUN` state it will remain running for at least this period of time.
# @dev This value may be increased anytime by the 

minInvestment: public(uint256)
# @notice The minimum amount of `currency` investment accepted.

revenueCommitmentBasisPoints: public(uint256)
# @notice The revenue commitment of the organization. Defines the percentage of the value paid through the contract
# that is automatically funneled and held into the buyback_reserve expressed in basis points.

state: public(uint256(stateMachine))
# @notice The current state of the contract.
# @dev See the constants above for possible state values.

#endregion

#region Read-only
##################################################

@private
@constant
def _toDecimalWithPlaces(
  _value: uint256
) -> decimal:
  """
  @dev Converts a uint token value into its decimal value, dropping the last 8 digits.
  e.g. 1 token is _value 1000000000000000000 and returns 1.0000000000
  Math: Max supported value is 2^127-1 * 10^18 == 1.7e+56
  """
  temp: uint256 = _value / DIGITS_UINT
  decimalValue: decimal = convert(_value - temp * DIGITS_UINT, decimal)
  decimalValue /= DIGITS_DECIMAL
  decimalValue += convert(temp, decimal)
  return decimalValue

@public
@constant
def buybackReserve() -> uint256:
  """
  @notice The total amount of currency value currently locked in the contract and available to sellers.
  """
  reserve: uint256
  if(self.currency == ZERO_ADDRESS):
    reserve = as_unitless_number(self.balance)
  else:
    reserve = self.currency.balanceOf(self)
  
  if(reserve > MAX_BEFORE_SQUARE):
    # Math: If the reserve becomes excessive, cap the value to prevent overflowing in other formulas
    return MAX_BEFORE_SQUARE

  return reserve

#endregion

#region Config / Control
##################################################

@public
def initialize(
  _bigDiv: address,
  _fairAddress: address,
  _initReserve: uint256,
  _currencyAddress: address,
  _initGoal: uint256,
  _buySlopeNum: uint256,
  _buySlopeDen: uint256,
  _investmentReserveBasisPoints: uint256,
  _revenueCommitmentBasisPoints: uint256
):
  """
  @notice Called once after deploy to set the initial configuration.
  None of the values provided here may change once initially set.
  @dev using the init pattern in order to support zos upgrades
  """
  assert self.control == ZERO_ADDRESS, "ALREADY_INITIALIZED"
  
  # Set initGoal, which in turn defines the initial state
  if(_initGoal == 0):
    log.StateChange(self.state, STATE_RUN)
    self.state = STATE_RUN
  else:
    # Math: If this value got too large, the DAT would overflow on sell
    assert _initGoal < MAX_BEFORE_SQUARE, "EXCESSIVE_GOAL"
    self.initGoal = _initGoal

  assert _bigDiv != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.bigDiv = IBigDiv(_bigDiv)

  assert _buySlopeNum > 0, "INVALID_SLOPE_NUM" # 0 not supported
  assert _buySlopeDen > 0, "INVALID_SLOPE_DEN"
  assert _buySlopeDen <= 1000000000000000000000000000, "SLOPE_DEN_OUT_OF_RANGE" # 1b full tokens to 1
  assert _buySlopeNum <= 1000000000000000000000000000, "SLOPE_NUM_OUT_OF_RANGE" # Fraction may be > 1; an extreme value
  self.buySlopeNum = _buySlopeNum
  self.buySlopeDen = _buySlopeDen
  assert _investmentReserveBasisPoints <= BASIS_POINTS_DEN, "INVALID_RESERVE" # 100% or less
  self.investmentReserveBasisPoints = _investmentReserveBasisPoints # 0 means all investments go to the beneficiary
  assert _revenueCommitmentBasisPoints <= BASIS_POINTS_DEN, "INVALID_COMMITMENT" # 100% or less
  self.revenueCommitmentBasisPoints = _revenueCommitmentBasisPoints # 0 means all renvue goes to the beneficiary

  # Set default values (which may be updated using `updateConfig`)
  self.burnThresholdBasisPoints = BASIS_POINTS_DEN
  self.minInvestment = as_unitless_number(as_wei_value(100, "ether"))
  self.beneficiary = msg.sender
  self.control = msg.sender
  self.feeCollector = msg.sender

  # Register supported interfaces
  # the 1820 address is constant for all networks
  IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24).setInterfaceImplementer(self, keccak256("ERC777TokensRecipient"), self)

  # Check if the currency is an ERC-777 token
  self.currencyAddress = _currencyAddress
  implementer: address = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24).getInterfaceImplementer(_currencyAddress, keccak256("ERC777Token"))
  if(implementer == ZERO_ADDRESS):
    self.currency = IERC777_20_Token(_currencyAddress)
    self.isCurrencyERC20 = True
  else:
    self.currency = IERC777_20_Token(implementer)

  # Initialize the FAIR token
  self.fairAddress = _fairAddress
  self.fair = IFAIR(_fairAddress)
  self.fair.initialize()

  # Mint the initial reserve
  if(_initReserve > 0):
    self.initReserve = _initReserve
    self.fair.mint(msg.sender, self.beneficiary, self.initReserve, "", "")

@public
def updateConfig(
  _authorizationAddress: address,
  _beneficiary: address,
  _control: address,
  _feeCollector: address,
  _feeBasisPoints: uint256,
  _burnThresholdBasisPoints: uint256,
  _minInvestment: uint256,
  _openUntilAtLeast: uint256,
  _name: string[64],
  _symbol: string[32]
):
  # This assert also confirms that initialize has been called.
  assert msg.sender == self.control, "CONTROL_ONLY"

  self.fair.updateConfig(_authorizationAddress, _name, _symbol)

  if(self.beneficiary != _beneficiary):
    assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"
    tokens: uint256 = self.fair.balanceOf(self.beneficiary)
    if(tokens > 0):
      self.fair.operatorSend(self.beneficiary, _beneficiary, tokens, "", "")
    self.initInvestors[_beneficiary] += self.initInvestors[self.beneficiary]
    self.initInvestors[self.beneficiary] = 0
    self.beneficiary = _beneficiary

  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.control = _control

  assert _feeCollector != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.feeCollector = _feeCollector

  assert _burnThresholdBasisPoints <= BASIS_POINTS_DEN, "INVALID_THRESHOLD" # 100% or less
  self.burnThresholdBasisPoints = _burnThresholdBasisPoints # 0 means burn all of beneficiary's holdings

  assert _feeBasisPoints <= BASIS_POINTS_DEN, "INVALID_FEE" # 100% or less
  self.feeBasisPoints = _feeBasisPoints # 0 means no fee

  assert _minInvestment > 0, "INVALID_MIN_INVESTMENT"
  self.minInvestment = _minInvestment

  assert _openUntilAtLeast >= self.openUntilAtLeast, "OPEN_UNTIL_MAY_NOT_BE_REDUCED"
  self.openUntilAtLeast = _openUntilAtLeast

  log.UpdateConfig(
    _authorizationAddress,
    _beneficiary,
    _control,
    _feeCollector,
    _burnThresholdBasisPoints,
    _feeBasisPoints,
    _minInvestment,
    _openUntilAtLeast,
    _name,
    _symbol
  )

#endregion

#region Transaction Helpers

@private
def _applyBurnThreshold():
  """
  @dev Burn tokens from the beneficiary account if they have too much of the total share.
  """
  balanceBefore: uint256 = self.fair.balanceOf(self.beneficiary)
  # Math: if totalSupply is < (2^256 - 1) / 10000 this will never overflow
  # totalSupply and burnedSupply are capped to MAX_BEFORE_SQUARE
  maxHoldings: uint256 = self.fair.totalSupply() + self.fair.burnedSupply()
  # burnThresholdBasisPoints is capped to BASIS_POINTS_DEN
  maxHoldings *= self.burnThresholdBasisPoints
  maxHoldings /= BASIS_POINTS_DEN

  if(balanceBefore > maxHoldings):
    # Math: the if condition prevents an underflow
    self.fair.operatorBurn(self.beneficiary, balanceBefore - maxHoldings, "", "")

@private
def _collectInvestment(
  _from: address,
  _quantityToInvest: uint256,
  _msgValue: uint256(wei),
  _refundRemainder: bool
):
  """
  @notice Confirms the transfer of `_quantityToInvest` currency to the contract.
  """
  if(self.currency == ZERO_ADDRESS): # currency is ETH
    if(_refundRemainder):
      # Math: if _msgValue was not sufficient then revert
      send(_from, _msgValue - _quantityToInvest)
    else:
      assert as_wei_value(_quantityToInvest, "wei") == _msgValue, "INCORRECT_MSG_VALUE"
  else: # currency is ERC20 or ERC777
    assert _msgValue == 0, "DO_NOT_SEND_ETH"

    if(self.isCurrencyERC20):
      success: bool = self.currency.transferFrom(_from, self, _quantityToInvest)
      assert success, "ERC20_TRANSFER_FAILED"
    else:
      self._isTransferFrom = True
      self.currency.operatorSend(_from, self, _quantityToInvest, "", "")
      self._isTransferFrom = False

@private
def _sendCurrency(
  _to: address,
  _amount: uint256
):
  """
  @dev Send `_amount` currency from the contract to the `_to` account.
  """
  if(_amount > 0):
    if(self.currency == ZERO_ADDRESS):
      send(_to, as_wei_value(_amount, "wei"))
    else:
      if(self.isCurrencyERC20):
        success: bool = self.currency.transfer(_to, as_unitless_number(_amount))
        assert success, "ERC20_TRANSFER_FAILED"
      else:
        self.currency.send(_to, as_unitless_number(_amount), "")

#endregion

#region Buy

@private
def _distributeInvestment(
  _value: uint256
):
  """
  @dev Distributes _value currency between the buybackReserve, beneficiary, and feeCollector.
  """
  # Rounding favors buybackReserve, then beneficiary, and feeCollector is last priority.

  # Math: if investment value is < (2^256 - 1) / 10000 this will never overflow.
  # With buybackReserve capped this could only fail with a huge single investment, but they can
  # try again with multiple smaller investments.
  reserve: uint256 = self.investmentReserveBasisPoints * _value
  reserve /= BASIS_POINTS_DEN
  reserve = _value - reserve
  # Math: since reserve is <= the investment value, this will never overflow.
  fee: uint256 = reserve * self.feeBasisPoints
  fee /= BASIS_POINTS_DEN

  # Math: since feeBasisPoints is <= BASIS_POINTS_DEN, this will never underflow.
  self._sendCurrency(self.beneficiary, reserve - fee)
  self._sendCurrency(self.feeCollector, fee)

@public
@payable
def buy(
  _to: address,
  _currencyValue: uint256,
  _minTokensBought: uint256
):
  """
  @notice Purchase FAIR tokens with the given amount of currency.
  @param _to The account to receive the FAIR tokens from this purchase.
  @param _currencyValue How much currency to spend in order to buy FAIR.
  @param _minTokensBought Buy at least this many FAIR tokens or the transaction reverts.
  @dev _minTokensBought is necessary as the price will change if some elses transaction mines after 
  yours was submitted.
  """
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _currencyValue >= self.minInvestment, "SEND_AT_LEAST_MIN_INVESTMENT"
  assert _minTokensBought > 0, "MUST_BUY_AT_LEAST_1"

  self._collectInvestment(msg.sender, _currencyValue, msg.value, False)

  # Calculate the tokenValue for this investment
  tokenValue: uint256
  if(self.state == STATE_INIT):
    # Math: initGoal and buySlopeNum/Den are capped such that overflow is not possible unless
    # a huge _currencyValue is provided, but they can retry with a smaller value
    tokenValue = 2 * _currencyValue * self.buySlopeDen
    tokenValue /= self.initGoal * self.buySlopeNum
    assert tokenValue <= self.initGoal, "MAX_INIT_GOAL"
  elif(self.state == STATE_RUN):
    # Math: supply's max value is 10e28 as enfored in FAIR.vy
    supply: uint256 = self.fair.totalSupply() + self.fair.burnedSupply()
    tokenValue = 2 * _currencyValue
    # Math: buySlopeDen is capped such that this only overflows with a huge _currencyValue, 
    # but they can retry with a smaller value
    # There is always room for at least (3e27)^2, or 9e56
    # buySlope is capped to 26 digits, leaving the worst case to limiting purchases to 30e-18 tokens
    tokenValue *= self.buySlopeDen
    tokenValue /= self.buySlopeNum
    # Math: to avoid overflow in _toDecimalWithPlaces, supply must be <= 1.3e28.  Then large 
    # _currencyValues may overflow, but they can retry with a smaller value
    tokenValue += supply * supply

    tokenValue /= DIGITS_UINT

    # Math: supports a max value of 1.7e+56 which is in-range given the comments above
    decimalValue: decimal = self._toDecimalWithPlaces(tokenValue) 

    decimalValue = sqrt(decimalValue)

    # Unshift results
    # Math: decimalValue has a max value of 2^127 - 1 which after sqrt can always be multiplied
    # here without overflow
    decimalValue *= DIGITS_DECIMAL

    tokenValue = convert(decimalValue, uint256)

    # Math: No underflow concern, as the value is at least supply^2 before the sqrt
    tokenValue -= supply
  else:
    assert False, "INVALID_STATE"

  assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"

  # Mint purchased tokens
  # Math: mint will fail if the supply exceeds the limit
  self.fair.mint(msg.sender, _to, tokenValue, "", "")
  log.Buy(msg.sender, _to, _currencyValue, tokenValue)

  # Update state, initInvestors, and distribute the investment when appropriate
  if(self.state == STATE_INIT):
    # Math: the hard-cap in mint ensures that this line could never overflow
    self.initInvestors[_to] += tokenValue
    # Math: this would only overflow if initReserve was burned, but auth blocks burning durning init
    if(self.fair.totalSupply() - self.initReserve >= self.initGoal):
      log.StateChange(self.state, STATE_RUN)
      self.state = STATE_RUN
      # Math: worst case is 1000000000000000000000000000 * MAX_BEFORE_SQUARE which won't overflow
      beneficiaryContribution: uint256 = self.bigDiv.bigDiv2x2(
        self.initInvestors[self.beneficiary] * self.buySlopeNum, self.initGoal,
        self.buySlopeDen, 2,
        False
      )
      self._distributeInvestment(self.buybackReserve() - beneficiaryContribution)
  elif(self.state == STATE_RUN):
    if(_to == self.beneficiary):
      self._applyBurnThreshold() # must mint before this call
    else:
      self._distributeInvestment(_currencyValue)

#endregion

#region Sell

@private
def _sell(
  _from: address,
  _to: address,
  _quantityToSell: uint256,
  _minCurrencyReturned: uint256,
  _hasReceivedFunds: bool
):
  buybackReserve: uint256 = self.buybackReserve()
  totalSupply: uint256 = self.fair.totalSupply()

  # Calculate currencyValue for this sale
  currencyValue: uint256
  if(self.state == STATE_RUN):
    burnedSupply: uint256 = self.fair.burnedSupply()
    supply: uint256 = totalSupply + burnedSupply
    quantityToSell: uint256 = _quantityToSell

    # buyback_reserve = r
    # total_supply = t
    # burnt_supply = b
    # amount = a
    # source: (t+b)*a*(2*r)/((t+b)^2)-(((2*r)/((t+b)^2)*a^2)/2)+((2*r)/((t+b)^2)*a*b^2)/(2*(t)) 
    # imp: (a b^2 r)/(t (b + t)^2) + (2 a r)/(b + t) - (a^2 r)/(b + t)^2

    # Math: burnedSupply is capped in FAIR such that the square will never overflow
    currencyValue = self.bigDiv.bigDiv3x3(
      quantityToSell, buybackReserve, burnedSupply * burnedSupply,
      totalSupply, supply, supply,
      False
    )
    # Math: worst-case currencyValue is MAX_BEFORE_SQUARE (max reserve, 1 supply)
    
    # Math: buybackReserve is capped such that this will not overflow for any value of 
    # quantityToSell (up to the supply's hard-cap)
    temp: uint256 = 2 * quantityToSell * buybackReserve
    temp /= supply
    # Math: worst-case temp is MAX_BEFORE_SQUARE (max reserve, 1 supply)

    # Math: considering the worst-case for currencyValue and temp, this can never overflow
    currencyValue += temp

    # Math: quantityToSell has to be less than the supply's hard-cap, which means squaring will never overflow
    # Math: this will not underflow as the terms before it will sum to a greater value
    currencyValue -= self.bigDiv.bigDiv2x2(
      quantityToSell * quantityToSell, buybackReserve, 
      supply, supply,
      True
    )
  elif(self.state == STATE_CLOSE):
    # Math: _quantityToSell and buybackReserve are both capped such that this can never overflow
    currencyValue = _quantityToSell * buybackReserve
    currencyValue /= totalSupply
  else: # STATE_INIT or STATE_CANCEL
    self.initInvestors[_from] -= _quantityToSell
    # Math: _quantityToSell and buybackReserve are both capped such that this can never overflow
    currencyValue = _quantityToSell * buybackReserve
    # Math: auth blocks initReserve from being burned unless we reach the RUN state which prevents an underflow
    currencyValue /= totalSupply - self.initReserve

  assert currencyValue > 0, "INSUFFICIENT_FUNDS"

  # Distribute funds
  if(_hasReceivedFunds):
    self.fair.burn(_quantityToSell, "")
  else:
    self.fair.operatorBurn(_from, _quantityToSell, "", "")
  
  self._sendCurrency(_to, currencyValue)
  log.Sell(_from, _to, currencyValue, _quantityToSell)

@public
def sell(
  _to: address,
  _quantityToSell: uint256,
  _minCurrencyReturned: uint256
):
  """
  @notice Sell FAIR tokens for at least the given amount of currency.
  @param _to The account to receive the currency from this sale.
  @param _quantityToSell How many FAIR tokens to sell for currency value.
  @param _minCurrencyReturned Get at least this many currency tokens or the transaction reverts.
  @dev _minCurrencyReturned is necessary as the price will change if some elses transaction mines after 
  yours was submitted.
  """
  self._sell(msg.sender, _to, _quantityToSell, _minCurrencyReturned, False)
#endregion

#region Pay

@private
def _pay(
  _from: address,
  _to: address,
  _currencyValue: uint256
):
  """
  @dev Pay the organization on-chain.
  @param _from The account which issued the transaction and paid the currencyValue.
  @param _to The account which receives tokens for the contribution.
  @param _currencyValue How much currency which was paid.
  """
  assert _from != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _currencyValue > 0, "MISSING_CURRENCY"
  assert self.state == STATE_RUN, "INVALID_STATE"

  # Send a portion of the funds to the beneficiary, the rest is added to the buybackReserve
  # Math: if _currencyValue is < (2^256 - 1) / 10000 this will never overflow
  reserve: uint256 = _currencyValue * self.investmentReserveBasisPoints
  reserve /= BASIS_POINTS_DEN
  # Math: this will never underflow since investmentReserveBasisPoints is capped to BASIS_POINTS_DEN
  self._sendCurrency(self.beneficiary, _currencyValue - reserve)

  # buy_slope = n/d
  # revenue_commitment = c/g
  # sqrt(
  #  (2 a c d)
  #  /
  #  (g n)
  #  + s^2
  # ) - s

  supply: uint256 = self.fair.totalSupply() + self.fair.burnedSupply()
  # Math: max _currencyValue of (2^256 - 1) / 2e31 == 5.7e45
  tokenValue: uint256 = 2 * _currencyValue * self.revenueCommitmentBasisPoints * self.buySlopeDen
  # Math: buySlopeNum is capped to prevent an overflow
  tokenValue /= BASIS_POINTS_DEN * self.buySlopeNum
  # Math: max supply^2 given the hard-cap is 1e56 leaving room for the max tokenValue (equal to the FAIR hard-cap)
  tokenValue += supply * supply

  # Math: Truncates last 18 digits from tokenValue here
  tokenValue /= DIGITS_UINT 

  # Math: Truncates another 8 digits from tokenValue (losing 26 digits in total)
  # This will cause small values to round to 0 tokens for the payment (the payment is still accepted)
  # Math: Max supported tokenValue is 1.7e+56. If supply is at the hard-cap tokenValue would be 1e38, leaving room
  # for a _currencyValue up to 1.7e33 (or 1.7e15 after decimals)
  decimalValue: decimal = self._toDecimalWithPlaces(tokenValue) 

  decimalValue = sqrt(decimalValue)

  # Unshift results
  # Math: decimalValue has a max value of 2^127 - 1 which after sqrt can always be multiplied
  # here without overflow
  decimalValue *= DIGITS_DECIMAL

  tokenValue = convert(decimalValue, uint256)

  # Math: No underflow concern, as the value is at least supply^2 before the sqrt
  tokenValue -= supply

  # Update the to address to the beneficiary if the currency value would fail
  to: address = _to
  if(to == ZERO_ADDRESS):
    to = self.beneficiary
  elif(not IAuthorization(self.fair.authorizationAddress())
    .isTransferAllowed(self, ZERO_ADDRESS, _to, tokenValue, "")):
    to = self.beneficiary

  # Distribute tokens
  if(tokenValue > 0):
    self.fair.mint(_from, to, tokenValue, "", "")
    self._applyBurnThreshold() # must mint before this call

  log.Pay(_from, _to, _currencyValue, tokenValue)

@public
@payable
def pay(
  _to: address,
  _currencyValue: uint256
):
  """
  @dev Pay the organization on-chain.
  @param _to The account which receives tokens for the contribution. If this address
  is not authorized to receive tokens then they will be sent to the beneficiary account instead.
  @param _currencyValue How much currency which was paid.
  """
  self._collectInvestment(msg.sender, _currencyValue, msg.value, False)
  self._pay(msg.sender, _to, _currencyValue)

@public
@payable
def __default__():
  """
  @dev Pay the organization on-chain with ETH (only works when currency is ETH)
  """
  self._collectInvestment(msg.sender, as_unitless_number(msg.value), msg.value, False)
  self._pay(msg.sender, msg.sender, as_unitless_number(msg.value))

#endregion

#region Close

@public
@payable
def close():
  """
  @notice Called by the beneficiary account to STATE_CLOSE or STATE_CANCEL the c-org, 
  preventing any more tokens from being minted.
  @dev Requires an `exitFee` to be paid.  If the currency is ETH, include a little more than
  what appears to be required and any remainder will be returned to your account.  This is 
  because another user may have a transaction mined which changes the exitFee required.
  For other `currency` types, the beneficiary account will be billed the exact amount required.
  """
  assert msg.sender == self.beneficiary, "BENEFICIARY_ONLY"

  exitFee: uint256 = 0

  if(self.state == STATE_INIT):
    # Allow the org to cancel anytime if the initGoal was not reached.
    log.StateChange(self.state, STATE_CANCEL)
    self.state = STATE_CANCEL
  elif(self.state == STATE_RUN):
    # Collect the exitFee and close the c-org.
    log.StateChange(self.state, STATE_CLOSE)
    self.state = STATE_CLOSE
    assert self.openUntilAtLeast <= block.timestamp, "TOO_EARLY"

    buybackReserve: uint256 = self.buybackReserve()
    buybackReserve -= as_unitless_number(msg.value)

    # Source: (t^2 * (n/d))/2 + b*(n/d)*t - r
    # Implementation: (n t (2 b + t))/(2 d) - r

    exitFee = 2 * self.fair.burnedSupply()
    # Math: the supply hard-cap ensures this does not overflow
    exitFee += self.fair.totalSupply()
    # Math: buySlopeNum and self.totalSupply caps of makes the worst case: 10 ** 28 * 10 ** 28 which does not overflow
    exitFee = self.bigDiv.bigDiv2x2(
      exitFee, self.buySlopeNum * self.fair.totalSupply(),
      2, self.buySlopeDen,
      False
    )
    # Math: this if condition avoids a potential overflow
    if(exitFee <= buybackReserve):
      exitFee = 0
    else:
      exitFee -= buybackReserve

    self._collectInvestment(msg.sender, exitFee, msg.value, True)
  else:
    assert False, "INVALID_STATE"
  
  log.Close(exitFee)

#endregion

@public
def tokensReceived(
  _operator: address,
  _from: address,
  _to: address,
  _amount: uint256,
  _userData: bytes[1024],
  _operatorData: bytes[1024]
):
  """
  @dev If FAIR: Sell tokens
  If currency: Pay the organization on-chain with ERC-777 tokens (only works when currency is ERC-777)
  Params are from the ERC-777 token standard
  """
  if(self._isTransferFrom):
    return
  if(msg.sender == self.currency):
    self._pay(_operator, _from, _amount)
  elif(msg.sender == self.fairAddress):
    self._sell(_from, _to, _amount, 1, True)
  else:
    assert False, "INVALID_TOKEN_TYPE"
