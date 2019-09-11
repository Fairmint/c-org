# @title Decentralized Autonomous Trust

#region Types
##################################################

from vyper.interfaces import ERC20

units: {
  stateMachine: "The DAT's internal state machine"
}

# TODO: switch to interface files
# Depends on https://github.com/ethereum/vyper/issues/1367
contract IBigDiv:
  def bigDiv2x1(
    _numA: uint256,
    _numB: uint256,
    _den: uint256,
    _roundUp: bool
  ) -> uint256: constant
  def bigDiv2x2(
    _numA: uint256,
    _numB: uint256,
    _denA: uint256,
    _denB: uint256
  ) -> uint256: constant
contract ERC1404:
  def authorizeTransfer(
    _from: address,
    _to: address,
    _value: uint256
  ): modifying
  def detectTransferRestriction(
    _from: address,
    _to: address,
    _value: uint256
  ) -> uint256: constant
contract IDAT:
  def state() -> uint256(stateMachine): constant
  def beneficiary() -> address: constant

implements: ERC20

# Events
###########

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

# Events specific to our use case
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
  _bigDivAddress: address,
  _erc1404Address: address,
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

MAX_BEFORE_SQUARE: constant(uint256)  = 340282366920938463463374607431768211456
# @notice When multiplying 2 terms, the max value is sqrt(2^256-1)

DIGITS_UINT: constant(uint256) = 10 ** 18
# @notice Represents 1 full token (with 18 decimals)

DIGITS_DECIMAL: constant(decimal) = convert(DIGITS_UINT, decimal)
# @notice Represents 1 full token (with 18 decimals)

BASIS_POINTS_DEN: constant(uint256) = 10000
# @notice The denominator component for values specified in basis points.

MAX_SUPPLY: constant(uint256)  = 10 ** 28
# @notice The max `totalSupply + burnedSupply`
# @dev This limit ensures that the DAT's formulas do not overflow

##############
# Data specific to our token business logic
##############

erc1404Address: public(address)
# @notice The contract address for transfer authorizations, if any.
# @dev This contract must implement the ERC1404 interface above

erc1404: ERC1404
# @notice The contract for transfer authorizations, if any.
# @dev This is redundant w/ erc1404Address, for convenience

burnedSupply: public(uint256)
# @notice The total number of burned FAIR tokens, excluding tokens burned from a `Sell` action in the DAT.

##############
# Data storage required by the ERC-20 token standard
##############

allowances: map(address, map(address, uint256))
# @notice Stores the `from` address to the `operator` address to the max value that operator is authorized to transfer.
# @dev not public: exposed via `allowance`

balanceOf: public(map(address, uint256))
# @notice Returns the account balance of another account with address _owner.

totalSupply: public(uint256)
# @notice The total number of tokens currently in circulation
# @dev This does not include the burnedSupply

##############
# Metadata suggested by the ERC-20 token standard
##############

name: public(string[64])
# @notice Returns the name of the token - e.g. "MyToken".
# @dev Optional requirement from ERC-20.

symbol: public(string[32])
# @notice Returns the symbol of the token. E.g. “HIX”.
# @dev Optional requirement from ERC-20

# Data for DAT business logic
###########

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

currency: ERC20
# @notice The address of the token used as reserve in the bonding curve
# (e.g. the DAI contract). Use ETH if 0.
# @dev redundant w/ currencyAddress, for convenience

feeCollector: public(address)
# @notice The address where fees are sent.

feeBasisPoints: public(uint256)
# @notice The percent fee collected each time new FAIR are issued expressed in basis points.

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

openUntilAtLeast: public(uint256)
# @notice The earliest date/time (in seconds) that the DAT may enter the `CLOSE` state, ensuring
# that if the DAT reaches the `RUN` state it will remain running for at least this period of time.
# @dev This value may be increased anytime by the control account

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
def _sqrtOfTokensSupplySquared(
  _tokenValue: uint256,
  _supply: uint256
) -> uint256:
  """
  @dev Returns the sqrt of the token value and adds supply^2 converted into whole number of tokens for the sqrt operation
  @returns uint256 the tokenValue after sqrt, converted back into base units
  """
  tokenValue: uint256 = _tokenValue

  # Math: max supply^2 given the hard-cap is 1e56 leaving room for the max tokenValue (equal to the FAIR hard-cap)
  tokenValue += _supply * _supply

  # Math: Truncates last 18 digits from tokenValue here
  tokenValue /= DIGITS_UINT

  # Math: Truncates another 8 digits from tokenValue (losing 26 digits in total)
  # This will cause small values to round to 0 tokens for the payment (the payment is still accepted)
  # Math: Max supported tokenValue is 1.7e+56. If supply is at the hard-cap tokenValue would be 1e38, leaving room
  # for a _currencyValue up to 1.7e33 (or 1.7e15 after decimals)

  temp: uint256 = tokenValue / DIGITS_UINT
  decimalValue: decimal = convert(tokenValue - temp * DIGITS_UINT, decimal)
  decimalValue /= DIGITS_DECIMAL
  decimalValue += convert(temp, decimal)

  decimalValue = sqrt(decimalValue)

  # Unshift results
  # Math: decimalValue has a max value of 2^127 - 1 which after sqrt can always be multiplied
  # here without overflow
  decimalValue *= DIGITS_DECIMAL

  tokenValue = convert(decimalValue, uint256)

  return tokenValue

@private
@constant
def _buybackReserve() -> uint256:
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

@public
@constant
def buybackReserve() -> uint256:
  return self._buybackReserve()

#endregion

#region Functions required for the ERC-1404 standard
##################################################

@private
def _detectTransferRestriction(
  _from: address,
  _to: address,
  _value: uint256
) -> uint256:
  if(self.erc1404 != ZERO_ADDRESS): # This is not set for the minting of initialReserve
    return self.erc1404.detectTransferRestriction(_from, _to, _value)
  return 0

@private
def _authorizeTransfer(
  _from: address,
  _to: address,
  _value: uint256
):
  if(self.erc1404 != ZERO_ADDRESS): # This is not set for the minting of initialReserve
    self.erc1404.authorizeTransfer(_from, _to, _value)

#endregion

#region Functions required by the ERC-20 token standard
##################################################

@private
def _send(
  _from: address,
  _to: address,
  _amount: uint256
):
  """
  @dev Moves tokens from one account to another if authorized.
  We have disabled the call hooks for ERC-20 style transfers in order to ensure other contracts interfacing with
  FAIR tokens (e.g. Uniswap) remain secure.
  """
  assert _from != ZERO_ADDRESS, "ERC20: send from the zero address"
  assert _to != ZERO_ADDRESS, "ERC20: send to the zero address"
  assert self.state != STATE_INIT or _from == self.beneficiary, "Only the beneficiary can make transfers during STATE_INIT"

  self._authorizeTransfer(_from, _to, _amount)

  self.balanceOf[_from] -= _amount
  self.balanceOf[_to] += _amount

  log.Transfer(_from, _to, _amount)

@public
@constant
def allowance(
  _owner: address,
  _spender: address
) -> uint256:
  """
  @notice Returns the amount which `_spender` is still allowed to withdraw from `_owner`.
  """
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
  """
  @notice Allows `_spender` to withdraw from your account multiple times, up to the `_value` amount.
  @dev If this function is called again it overwrites the current allowance with `_value`.
  """
  assert _spender != ZERO_ADDRESS, "ERC777: approve to the zero address"

  self.allowances[msg.sender][_spender] = _value
  log.Approval(msg.sender, _spender, _value)
  return True

@public
def transfer(
  _to: address,
  _value: uint256
) -> bool:
  """
  @notice Transfers `_value` amount of tokens to address `_to` if authorized.
  """
  self._send(msg.sender, _to, _value)
  return True

@public
def transferFrom(
  _from: address,
  _to: address,
  _value: uint256
) -> bool:
  """
  @notice Transfers `_value` amount of tokens from address `_from` to address `_to` if authorized.
  """
  self.allowances[_from][msg.sender] -= _value
  self._send(_from, _to, _value)
  return True

#endregion

#region Transaction Helpers

@private
def _burn(
  _from: address,
  _amount: uint256,
  _isSell: bool
):
  """
  @dev Removes tokens from the circulating supply.
  params from the ERC-777 token standard
  """
  assert _from != ZERO_ADDRESS, "ERC20: burn from the zero address"

  self.balanceOf[_from] -= _amount
  self.totalSupply -= _amount

  if(_isSell):
    # This is a sell
    self._authorizeTransfer(_from, ZERO_ADDRESS, _amount)
  else:
    # This is a burn
    assert self.state == STATE_RUN, "ONLY_DURING_RUN"

    self.burnedSupply += _amount

  log.Transfer(_from, ZERO_ADDRESS, _amount)

@private
def _applyBurnThreshold():
  """
  @dev Burn tokens from the beneficiary account if they have too much of the total share.
  """
  balanceBefore: uint256 = self.balanceOf[self.beneficiary]
  # Math: if totalSupply is < (2^256 - 1) / 10000 this will never overflow
  # totalSupply and burnedSupply are capped to MAX_BEFORE_SQUARE
  maxHoldings: uint256 = self.totalSupply + self.burnedSupply
  # burnThresholdBasisPoints is capped to BASIS_POINTS_DEN
  maxHoldings *= self.burnThresholdBasisPoints
  maxHoldings /= BASIS_POINTS_DEN

  if(balanceBefore > maxHoldings):
    # Math: the if condition prevents an underflow
    self._burn(self.beneficiary, balanceBefore - maxHoldings, False)

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
      refund: uint256(wei) = _msgValue - _quantityToInvest
      if(refund > 0):
      # TODO switch from send to raw_call
        send(_from, _msgValue - _quantityToInvest)
        # raw_call(_from, b"", outsize=0, value=refund, gas=msg.gas)
    else:
      assert as_wei_value(_quantityToInvest, "wei") == _msgValue, "INCORRECT_MSG_VALUE"
  else: # currency is ERC20
    assert _msgValue == 0, "DO_NOT_SEND_ETH"

    success: bool = self.currency.transferFrom(_from, self, _quantityToInvest)
    assert success, "ERC20_TRANSFER_FAILED"

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
      # TODO switch from send to raw_call
      send(_to, as_wei_value(_amount, "wei"))
      # raw_call(_from, b"", outsize=0, value=as_wei_value(_amount, "wei"), gas=msg.gas)
    else:
      success: bool = self.currency.transfer(_to, as_unitless_number(_amount))
      assert success, "ERC20_TRANSFER_FAILED"

@private
def _mint(
  _to: address,
  _quantity: uint256
):
  """
  @notice Called by the owner, which is the DAT contract, in order to mint tokens on `buy`.
  """
  assert _to != ZERO_ADDRESS, "INVALID_ADDRESS"
  assert _quantity > 0, "INVALID_QUANTITY"
  self._authorizeTransfer(ZERO_ADDRESS, _to, _quantity)

  self.totalSupply += _quantity
  # Math: If this value got too large, the DAT may overflow on sell
  assert self.totalSupply + self.burnedSupply <= MAX_SUPPLY, "EXCESSIVE_SUPPLY"
  self.balanceOf[_to] += _quantity

  log.Transfer(ZERO_ADDRESS, _to, _quantity)

#endregion

#region Config / Control
##################################################

@public
def initialize(
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

  assert _buySlopeNum > 0, "INVALID_SLOPE_NUM" # 0 not supported
  assert _buySlopeDen > 0, "INVALID_SLOPE_DEN"
  assert _buySlopeNum < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_NUM" # 0 not supported
  assert _buySlopeDen < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_DEN"
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

  # Save currency
  self.currencyAddress = _currencyAddress
  self.currency = ERC20(_currencyAddress)

  # Mint the initial reserve
  if(_initReserve > 0):
    self.initReserve = _initReserve
    self._mint(self.beneficiary, self.initReserve)

@public
def updateConfig(
  _bigDiv: address,
  _erc1404Address: address,
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

  self.name = _name
  self.symbol = _symbol

  assert _erc1404Address != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.erc1404Address = _erc1404Address
  self.erc1404 = ERC1404(_erc1404Address)

  assert _bigDiv != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.bigDivAddress = _bigDiv
  self.bigDiv = IBigDiv(_bigDiv)

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

  if(self.beneficiary != _beneficiary):
    assert _beneficiary != ZERO_ADDRESS, "INVALID_ADDRESS"
    tokens: uint256 = self.balanceOf[self.beneficiary]
    self.initInvestors[_beneficiary] += self.initInvestors[self.beneficiary]
    self.initInvestors[self.beneficiary] = 0
    if(tokens > 0):
      self._send(self.beneficiary, _beneficiary, tokens)
    self.beneficiary = _beneficiary

  log.UpdateConfig(
    _bigDiv,
    _erc1404Address,
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

#region Functions for our business logic
##################################################

@public
def burn(
  _amount: uint256
):
  """
  @notice Burn the amount of tokens from the address msg.sender if authorized.
  @dev Note that this is not the same as a `sell` via the DAT.
  """
  self._burn(msg.sender, _amount, False)

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
  # Except maybe with a huge single investment, but they can try again with multiple smaller investments.
  reserve: uint256 = self.investmentReserveBasisPoints * _value
  reserve /= BASIS_POINTS_DEN
  reserve = _value - reserve
  # Math: since reserve is <= the investment value, this will never overflow.
  fee: uint256 = reserve * self.feeBasisPoints
  fee /= BASIS_POINTS_DEN

  # Math: since feeBasisPoints is <= BASIS_POINTS_DEN, this will never underflow.
  self._sendCurrency(self.beneficiary, reserve - fee)
  self._sendCurrency(self.feeCollector, fee)

@private
@constant
def _estimateBuyValue(
  _currencyValue: uint256
) -> uint256:
  """
  @notice Calculate how many FAIR tokens you would buy with the given amount of currency if `buy` was called now.
  @param _currencyValue How much currency to spend in order to buy FAIR.
  """
  if(_currencyValue < self.minInvestment):
    return 0

  # Calculate the tokenValue for this investment
  tokenValue: uint256
  if(self.state == STATE_INIT):
    tokenValue = self.bigDiv.bigDiv2x2(
      2 * _currencyValue, self.buySlopeDen,
      self.initGoal, self.buySlopeNum
    )
    if(tokenValue > self.initGoal):
      return 0
  elif(self.state == STATE_RUN):
    # Math: supply's max value is 10e28 as enforced in FAIR.vy
    supply: uint256 = self.totalSupply + self.burnedSupply
    tokenValue = self.bigDiv.bigDiv2x1(
      2 * _currencyValue, self.buySlopeDen,
      self.buySlopeNum,
      False
    )
    
    tokenValue = self._sqrtOfTokensSupplySquared(tokenValue, supply)

    # Math: small chance of underflow due to possible rounding in sqrt
    if(tokenValue > supply):
      tokenValue -= supply
    else:
      tokenValue = 0
  else:
    return 0 # invalid state

  return tokenValue

@public
@constant
def estimateBuyValue(
  _currencyValue: uint256
) -> uint256:
  return self._estimateBuyValue(_currencyValue)

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
  assert _minTokensBought > 0, "MUST_BUY_AT_LEAST_1"

  # Calculate the tokenValue for this investment
  tokenValue: uint256 = self._estimateBuyValue(_currencyValue)
  assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"

  log.Buy(msg.sender, _to, _currencyValue, tokenValue)

  self._collectInvestment(msg.sender, _currencyValue, msg.value, False)

  # Update state, initInvestors, and distribute the investment when appropriate
  if(self.state == STATE_INIT):
    # Math: the hard-cap in mint ensures that this line could never overflow
    self.initInvestors[_to] += tokenValue
    # Math: this would only overflow if initReserve was burned, but FAIR blocks burning durning init
    if(self.totalSupply + tokenValue - self.initReserve >= self.initGoal):
      log.StateChange(self.state, STATE_RUN)
      self.state = STATE_RUN
      beneficiaryContribution: uint256 = self.bigDiv.bigDiv2x1(
        self.initInvestors[self.beneficiary], self.buySlopeNum * self.initGoal,
        self.buySlopeDen * 2,
        False
      )
      self._distributeInvestment(self._buybackReserve() - beneficiaryContribution)
  elif(self.state == STATE_RUN):
    if(_to != self.beneficiary):
      self._distributeInvestment(_currencyValue)

  self._mint(_to, tokenValue)

  if(self.state == STATE_RUN):
    if(_to == self.beneficiary):
      self._applyBurnThreshold() # must mint before this call

#endregion

#region Sell

@private
@constant
def _estimateSellValue(
  _quantityToSell: uint256
) -> uint256:
  buybackReserve: uint256 = self._buybackReserve()

  # Calculate currencyValue for this sale
  currencyValue: uint256
  if(self.state == STATE_RUN):
    supply: uint256 = self.totalSupply + self.burnedSupply

    # buyback_reserve = r
    # total_supply = t
    # burnt_supply = b
    # amount = a
    # source: (t+b)*a*(2*r)/((t+b)^2)-(((2*r)/((t+b)^2)*a^2)/2)+((2*r)/((t+b)^2)*a*b^2)/(2*(t))
    # imp: (a b^2 r)/(t (b + t)^2) + (2 a r)/(b + t) - (a^2 r)/(b + t)^2

    # Math: burnedSupply is capped in FAIR such that the square will never overflow
    currencyValue = self.bigDiv.bigDiv2x2(
      _quantityToSell * buybackReserve, self.burnedSupply * self.burnedSupply,
      self.totalSupply, supply * supply
    )
    # Math: worst-case currencyValue is MAX_BEFORE_SQUARE (max reserve, 1 supply)

    # Math: buybackReserve is capped such that this will not overflow for any value of
    # quantityToSell (up to the supply's hard-cap)
    temp: uint256 = 2 * _quantityToSell * buybackReserve
    temp /= supply
    # Math: worst-case temp is MAX_BEFORE_SQUARE (max reserve, 1 supply)

    # Math: considering the worst-case for currencyValue and temp, this can never overflow
    currencyValue += temp

    # Math: quantityToSell has to be less than the supply's hard-cap, which means squaring will never overflow
    # Math: this will not underflow as the terms before it will sum to a greater value
    currencyValue -= self.bigDiv.bigDiv2x1(
      _quantityToSell * _quantityToSell, buybackReserve,
      supply * supply,
      True
    )
  elif(self.state == STATE_CLOSE):
    # Math: _quantityToSell and buybackReserve are both capped such that this can never overflow
    currencyValue = _quantityToSell * buybackReserve
    currencyValue /= self.totalSupply
  else: # STATE_INIT or STATE_CANCEL
    # Math: _quantityToSell and buybackReserve are both capped such that this can never overflow
    currencyValue = _quantityToSell * buybackReserve
    # Math: FAIR blocks initReserve from being burned unless we reach the RUN state which prevents an underflow
    currencyValue /= self.totalSupply - self.initReserve

  return currencyValue

@public
@constant
def estimateSellValue(
  _quantityToSell: uint256
) -> uint256:
  return self._estimateSellValue(_quantityToSell)

@private
def _sell(
  _from: address,
  _to: address,
  _quantityToSell: uint256,
  _minCurrencyReturned: uint256,
  _hasReceivedFunds: bool
):
  assert _from != self.beneficiary or self.state >= STATE_CLOSE, "BENEFICIARY_ONLY_SELL_IN_CLOSE_OR_CANCEL"
  assert _minCurrencyReturned > 0, "MUST_SELL_AT_LEAST_1"

  currencyValue: uint256 = self._estimateSellValue(_quantityToSell)
  assert currencyValue >= _minCurrencyReturned, "PRICE_SLIPPAGE"

  if(self.state == STATE_INIT or self.state == STATE_CANCEL):
    self.initInvestors[_from] -= _quantityToSell

  # Distribute funds
  if(_hasReceivedFunds):
    self._burn(self, _quantityToSell, True)
  else:
    self._burn(_from, _quantityToSell, True)

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
@constant
def _estimatePayValue(
  _currencyValue: uint256
) -> uint256:
  # buy_slope = n/d
  # revenue_commitment = c/g
  # sqrt(
  #  (2 a c d)
  #  /
  #  (g n)
  #  + s^2
  # ) - s

  supply: uint256 = self.totalSupply + self.burnedSupply

  # Math: max _currencyValue of (2^256 - 1) / 2e31 == 5.7e45 (* 2 * BASIS_POINTS won't overflow)
  tokenValue: uint256 = self.bigDiv.bigDiv2x1(
    2 * _currencyValue * self.revenueCommitmentBasisPoints, self.buySlopeDen,
    BASIS_POINTS_DEN * self.buySlopeNum,
    False
  )

  tokenValue = self._sqrtOfTokensSupplySquared(tokenValue, supply)

  if(tokenValue > supply):
    tokenValue -= supply
  else:
    tokenValue = 0

  return tokenValue

@public
@constant
def estimatePayValue(
  _currencyValue: uint256
) -> uint256:
  return self._estimatePayValue(_currencyValue)

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

  tokenValue: uint256 = self._estimatePayValue(_currencyValue)

  # Update the to address to the beneficiary if the currency value would fail
  to: address = _to
  if(to == ZERO_ADDRESS):
    to = self.beneficiary
  elif(self._detectTransferRestriction(ZERO_ADDRESS, _to, tokenValue) != 0):
    to = self.beneficiary

  # Math: this will never underflow since investmentReserveBasisPoints is capped to BASIS_POINTS_DEN
  self._sendCurrency(self.beneficiary, _currencyValue - reserve)

  # Distribute tokens
  if(tokenValue > 0):
    self._mint(to, tokenValue)
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

@private
@constant
def _estimateExitFee(
  _msgValue: uint256(wei)
) -> uint256:
  exitFee: uint256 = 0

  if(self.state == STATE_RUN):
    buybackReserve: uint256 = self._buybackReserve()
    buybackReserve -= as_unitless_number(_msgValue)

    # Source: (t^2 * (n/d))/2 + b*(n/d)*t - r
    # Implementation: (n t (2 b + t))/(2 d) - r

    exitFee = 2 * self.burnedSupply
    # Math: the supply hard-cap ensures this does not overflow
    exitFee += self.totalSupply
    # Math: self.totalSupply cap makes the worst case: 10 ** 28 * 10 ** 28 which does not overflow
    exitFee = self.bigDiv.bigDiv2x1(
      exitFee * self.totalSupply, self.buySlopeNum,
      2 * self.buySlopeDen,
      False
    )
    # Math: this if condition avoids a potential overflow
    if(exitFee <= buybackReserve):
      exitFee = 0
    else:
      exitFee -= buybackReserve

  return exitFee

@public
@constant
def estimateExitFee(
  _msgValue: uint256(wei)
) -> uint256:
  return self._estimateExitFee(_msgValue)

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
    assert self.openUntilAtLeast <= block.timestamp, "TOO_EARLY"

    exitFee = self._estimateExitFee(msg.value)

    log.StateChange(self.state, STATE_CLOSE)
    self.state = STATE_CLOSE

    self._collectInvestment(msg.sender, exitFee, msg.value, True)
  else:
    assert False, "INVALID_STATE"

  log.Close(exitFee)

#endregion
