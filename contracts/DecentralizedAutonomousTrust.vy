# @title Decentralized Autonomous Trust
# This contract is the reference implementation provided by Fairmint for a
# Decentralized Autonomous Trust as described in the continuous
# organization whitepaper (https://github.com/c-org/whitepaper) and
# specified here: https://github.com/fairmint/c-org/wiki. Use at your own
# risk. If you have question or if you're looking for a ready-to-use
# solution using this contract, you might be interested in Fairmint's
# offering. Do not hesitate to get in touch with us: https://fairmint.co

from vyper.interfaces import ERC20

units: {
  stateMachine: "The DAT's internal state machine"
}

contract IBigMath:
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
  def sqrtOfTokensSupplySquared(
    _tokenValue: uint256,
    _supply: uint256
  ) -> uint256: constant
contract Whitelist:
  def authorizeTransfer(
    _from: address,
    _to: address,
    _value: uint256,
    _isSell: bool
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
  _from: indexed(address),
  _to: indexed(address),
  _currencyValue: uint256,
  _fairValue: uint256
})
Sell: event({
  _from: indexed(address),
  _to: indexed(address),
  _currencyValue: uint256,
  _fairValue: uint256
})
Pay: event({
  _from: indexed(address),
  _to: indexed(address),
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
  _bigMathAddress: address,
  _whitelistAddress: address,
  _beneficiary: indexed(address),
  _control: indexed(address),
  _feeCollector: indexed(address),
  _autoBurn: bool,
  _revenueCommitmentBasisPoints: uint256,
  _feeBasisPoints: uint256,
  _minInvestment: uint256,
  _openUntilAtLeast: uint256,
  _name: string[64],
  _symbol: string[32]
})

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

MAX_BEFORE_SQUARE: constant(uint256)  = 340282366920938463463374607431768211455
# @notice When multiplying 2 terms, the max value is 2^128-1

BASIS_POINTS_DEN: constant(uint256) = 10000
# @notice The denominator component for values specified in basis points.

MAX_SUPPLY: constant(uint256)  = 10 ** 38
# @notice The max `totalSupply + burnedSupply`
# @dev This limit ensures that the DAT's formulas do not overflow (<MAX_BEFORE_SQUARE/2)

##############
# Data specific to our token business logic
##############

whitelistAddress: public(address)
# @notice The contract address for transfer authorizations, if any.
# @dev This contract must implement the Whitelist interface above

whitelist: Whitelist
# @notice The contract for transfer authorizations, if any.
# @dev This is redundant w/ whitelistAddress, for convenience

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

autoBurn: public(bool)
# @notice Set if the FAIRs minted by the organization when it commits its revenues are
# automatically burnt (`true`) or not (`false`). Defaults to `false` meaning that there
# is no automatic burn.

beneficiary: public(address)
# @notice The address of the beneficiary organization which receives the investments.
# Points to the wallet of the organization.

bigMathAddress: public(address)
# @notice The BigMath library we use for BigNumber math

bigMath: IBigMath
# @notice The BigMath library we use for BigNumber math
# @dev redundant w/ currencyAddress, for convenience

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

@private
@constant
def _buybackReserve() -> uint256:
  """
  @notice The total amount of currency value currently locked in the contract and available to sellers.
  """
  reserve: uint256 = as_unitless_number(self.balance)
  if(self.currency != ZERO_ADDRESS):
    reserve = self.currency.balanceOf(self)

  if(reserve > MAX_BEFORE_SQUARE):
    # Math: If the reserve becomes excessive, cap the value to prevent overflowing in other formulas
    return MAX_BEFORE_SQUARE

  return reserve

@public
@constant
def buybackReserve() -> uint256:
  return self._buybackReserve()

# Functions required for the whitelist
##################################################

@private
@constant
def _detectTransferRestriction(
  _from: address,
  _to: address,
  _value: uint256
) -> uint256:
  if(self.whitelist != ZERO_ADDRESS): # This is not set for the minting of initialReserve
    return self.whitelist.detectTransferRestriction(_from, _to, _value)
  return 0

@private
def _authorizeTransfer(
  _from: address,
  _to: address,
  _value: uint256,
  _isSell: bool
):
  if(self.whitelist != ZERO_ADDRESS): # This is not set for the minting of initialReserve
    self.whitelist.authorizeTransfer(_from, _to, _value, _isSell)


# Functions required by the ERC-20 token standard
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

  self._authorizeTransfer(_from, _to, _amount, False)

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
  @dev Hardcoded to 18
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
  assert _spender != ZERO_ADDRESS, "ERC20: approve to the zero address"

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


# Transaction Helpers

@private
def _burn(
  _from: address,
  _amount: uint256,
  _isSell: bool
):
  """
  @dev Removes tokens from the circulating supply.
  """
  assert _from != ZERO_ADDRESS, "ERC20: burn from the zero address"

  self.balanceOf[_from] -= _amount
  self.totalSupply -= _amount

  self._authorizeTransfer(_from, ZERO_ADDRESS, _amount, _isSell)
  if(not _isSell):
    # This is a burn
    assert self.state == STATE_RUN, "ONLY_DURING_RUN"
    self.burnedSupply += _amount

  log.Transfer(_from, ZERO_ADDRESS, _amount)

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
        # this call fails if we don't capture a response
        res: bytes[1] = raw_call(_from, b"", outsize=0, value=refund, gas=msg.gas)
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
      # this call fails if we don't capture a response
      res: bytes[1] = raw_call(_to, b"", outsize=0, value=as_wei_value(_amount, "wei"), gas=msg.gas)
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
  self._authorizeTransfer(ZERO_ADDRESS, _to, _quantity, False)

  self.totalSupply += _quantity
  # Math: If this value got too large, the DAT may overflow on sell
  assert self.totalSupply + self.burnedSupply <= MAX_SUPPLY, "EXCESSIVE_SUPPLY"
  self.balanceOf[_to] += _quantity

  log.Transfer(ZERO_ADDRESS, _to, _quantity)

# Config / Control
##################################################

@public
def initialize(
  _initReserve: uint256,
  _currencyAddress: address,
  _initGoal: uint256,
  _buySlopeNum: uint256,
  _buySlopeDen: uint256,
  _investmentReserveBasisPoints: uint256
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
    assert _initGoal < MAX_SUPPLY, "EXCESSIVE_GOAL"
    self.initGoal = _initGoal

  assert _buySlopeNum > 0, "INVALID_SLOPE_NUM" # 0 not supported
  assert _buySlopeDen > 0, "INVALID_SLOPE_DEN"
  assert _buySlopeNum < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_NUM" # 0 not supported
  assert _buySlopeDen < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_DEN"
  self.buySlopeNum = _buySlopeNum
  self.buySlopeDen = _buySlopeDen
  assert _investmentReserveBasisPoints <= BASIS_POINTS_DEN, "INVALID_RESERVE" # 100% or less
  self.investmentReserveBasisPoints = _investmentReserveBasisPoints # 0 means all investments go to the beneficiary

  # Set default values (which may be updated using `updateConfig`)
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
  _bigMath: address,
  _whitelistAddress: address,
  _beneficiary: address,
  _control: address,
  _feeCollector: address,
  _feeBasisPoints: uint256,
  _autoBurn: bool,
  _revenueCommitmentBasisPoints: uint256,
  _minInvestment: uint256,
  _openUntilAtLeast: uint256,
  _name: string[64],
  _symbol: string[32]
):
  # This assert also confirms that initialize has been called.
  assert msg.sender == self.control, "CONTROL_ONLY"

  self.name = _name
  self.symbol = _symbol

  assert _whitelistAddress != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.whitelistAddress = _whitelistAddress
  self.whitelist = Whitelist(_whitelistAddress)

  assert _bigMath != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.bigMathAddress = _bigMath
  self.bigMath = IBigMath(_bigMath)

  assert _control != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.control = _control

  assert _feeCollector != ZERO_ADDRESS, "INVALID_ADDRESS"
  self.feeCollector = _feeCollector

  self.autoBurn = _autoBurn

  assert _revenueCommitmentBasisPoints <= BASIS_POINTS_DEN, "INVALID_COMMITMENT" # 100% or less
  assert _revenueCommitmentBasisPoints >= self.revenueCommitmentBasisPoints, "COMMITMENT_MAY_NOT_BE_REDUCED"
  self.revenueCommitmentBasisPoints = _revenueCommitmentBasisPoints # 0 means all renvue goes to the beneficiary

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
    _bigMath,
    _whitelistAddress,
    _beneficiary,
    _control,
    _feeCollector,
    _autoBurn,
    _revenueCommitmentBasisPoints,
    _feeBasisPoints,
    _minInvestment,
    _openUntilAtLeast,
    _name,
    _symbol
  )

# Functions for our business logic
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

# Buy

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
  tokenValue: uint256 = 0
  if(self.state == STATE_INIT):
    # Math: worst case
    # 2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
    # / MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
    tokenValue = self.bigMath.bigDiv2x1(
      2 * _currencyValue, self.buySlopeDen,
      self.initGoal * self.buySlopeNum,
      False
    )
    if(tokenValue > self.initGoal):
      return 0
  elif(self.state == STATE_RUN):
    supply: uint256 = self.totalSupply + self.burnedSupply
    # Math: worst case
    # 2 * MAX_BEFORE_SQUARE / 2 * MAX_BEFORE_SQUARE
    # / MAX_BEFORE_SQUARE
    tokenValue = 2 * _currencyValue * self.buySlopeDen
    tokenValue /= self.buySlopeNum
    
    tokenValue = self.bigMath.sqrtOfTokensSupplySquared(tokenValue, supply)

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
    # Math worst case: MAX_BEFORE_SQUARE
    self.initInvestors[_to] += tokenValue
    # Math worst case:
    # MAX_BEFORE_SQUARE + MAX_BEFORE_SQUARE
    if(self.totalSupply + tokenValue - self.initReserve >= self.initGoal):
      log.StateChange(self.state, STATE_RUN)
      self.state = STATE_RUN
      # Math worst case:
      # MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2
      # / MAX_BEFORE_SQUARE * 2
      beneficiaryContribution: uint256 = self.bigMath.bigDiv2x1(
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
    if(msg.sender == self.beneficiary and _to == self.beneficiary and self.autoBurn):
      self._burn(self.beneficiary, tokenValue, False) # must mint before this call

# Sell

@private
@constant
def _estimateSellValue(
  _quantityToSell: uint256
) -> uint256:
  buybackReserve: uint256 = self._buybackReserve()

  # Calculate currencyValue for this sale
  currencyValue: uint256 = 0
  if(self.state == STATE_RUN):
    supply: uint256 = self.totalSupply + self.burnedSupply

    # buyback_reserve = r
    # total_supply = t
    # burnt_supply = b
    # amount = a
    # source: (t+b)*a*(2*r)/((t+b)^2)-(((2*r)/((t+b)^2)*a^2)/2)+((2*r)/((t+b)^2)*a*b^2)/(2*(t))
    # imp: (a b^2 r)/(t (b + t)^2) + (2 a r)/(b + t) - (a^2 r)/(b + t)^2

    # Math: burnedSupply is capped in FAIR such that the square will never overflow
    # Math worst case:
    # MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
    # / MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
    currencyValue = self.bigMath.bigDiv2x2(
      _quantityToSell * buybackReserve, self.burnedSupply * self.burnedSupply,
      self.totalSupply, supply * supply
    )
    # Math: worst case currencyValue is MAX_BEFORE_SQUARE (max reserve, 1 supply)

    # Math worst case:
    # 2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
    temp: uint256 = 2 * _quantityToSell * buybackReserve
    temp /= supply
    # Math: worst-case temp is MAX_BEFORE_SQUARE (max reserve, 1 supply)

    # Math: considering the worst-case for currencyValue and temp, this can never overflow
    currencyValue += temp

    # Math: worst case
    # MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
    # / MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
    currencyValue -= self.bigMath.bigDiv2x1(
      _quantityToSell * _quantityToSell, buybackReserve,
      supply * supply,
      True
    )
  elif(self.state == STATE_CLOSE):
    # Math worst case
    # MAX_BEFORE_SQUARE / 2 * MAX_BEFORE_SQUARE
    currencyValue = _quantityToSell * buybackReserve
    currencyValue /= self.totalSupply
  else: # STATE_INIT or STATE_CANCEL
    # Math worst case:
    # MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
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

# Pay

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

  # Math: worst case
  # 2 * MAX_BEFORE_SQUARE/2 * 10000 * MAX_BEFORE_SQUARE
  # / 10000 * MAX_BEFORE_SQUARE
  tokenValue: uint256 = self.bigMath.bigDiv2x1(
    2 * _currencyValue * self.revenueCommitmentBasisPoints, self.buySlopeDen,
    BASIS_POINTS_DEN * self.buySlopeNum,
    False
  )

  tokenValue = self.bigMath.sqrtOfTokensSupplySquared(tokenValue, supply)

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
    if(to == self.beneficiary and self.autoBurn):
      self._burn(self.beneficiary, tokenValue, False) # must mint before this call

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

# Close

@private
@constant
def _estimateExitFee(
  _msgValue: uint256(wei)
) -> uint256:
  exitFee: uint256 = 0

  if(self.state == STATE_RUN):
    buybackReserve: uint256 = self._buybackReserve()
    buybackReserve -= as_unitless_number(_msgValue)

    # Source: t*(t+b)*(n/d)-r
    # Implementation: (b n t)/d + (n t^2)/d - r

    # Math worst case:
    # MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
    exitFee = self.bigMath.bigDiv2x1(
      self.burnedSupply * self.buySlopeNum, self.totalSupply,
      self.buySlopeDen,
      False
    )
    # Math worst case:
    # MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
    exitFee += self.bigMath.bigDiv2x1(
      self.buySlopeNum * self.totalSupply, self.totalSupply,
      self.buySlopeDen,
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
