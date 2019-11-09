pragma solidity 0.5.12;

import "hardlydifficult-ethereum-contracts/contracts/math/BigDiv.sol";
import "hardlydifficult-ethereum-contracts/contracts/math/Sqrt.sol";
import "./Whitelist.sql";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/**
 * @title Decentralized Autonomous Trust
 * This contract is the reference implementation provided by Fairmint for a
 * Decentralized Autonomous Trust as described in the continuous
 * organization whitepaper (https://github.com/c-org/whitepaper) and
 * specified here: https://github.com/fairmint/c-org/wiki. Use at your own
 * risk. If you have question or if you're looking for a ready-to-use
 * solution using this contract, you might be interested in Fairmint's
 * offering. Do not hesitate to get in touch with us: https://fairmint.co
 */
contract DecentralizedAutonomousTrust
  is IERC20
{
  using Sqrt for uint;

  /**
   * Events
   */

  event Buy(
    address indexed _from,
    address indexed _to,
    uint _currencyValue,
    uint _fairValue
  );
  event Sell(
    address indexed _from,
    address indexed _to,
    uint _currencyValue,
    uint _fairValue
  );
  event Pay(
    address indexed _from,
    address indexed _to,
    uint _currencyValue,
    uint _fairValue
  );
  // TODO add burn
  event Close(
    uint _exitFee
  );
  event StateChange(
    uint _previousState,
    uint _newState
  );
  event UpdateConfig(
    address _bigDivAddress,
    address _sqrtAddress,
    address _whitelistAddress,
    address indexed _beneficiary,
    address indexed _control,
    address indexed _feeCollector,
    bool _autoBurn,
    uint _revenueCommitmentBasisPoints,
    uint _feeBasisPoints,
    uint _minInvestment,
    uint _openUntilAtLeast,
    string _name,
    string _symbol
  );

  /**
   * Constants
   */

  /// @notice The default state
  uint constant STATE_INIT = 0;

  /// @notice The state after initGoal has been reached
  uint constant STATE_RUN = 1;

  /// @notice The state after closed by the `beneficiary` account from STATE_RUN
  uint constant STATE_CLOSE = 2;

  /// @notice The state after closed by the `beneficiary` account from STATE_INIT
  uint constant STATE_CANCEL = 3;

  /// @notice When multiplying 2 terms, the max value is 2^128-1
  uint constant MAX_BEFORE_SQUARE = 340282366920938463463374607431768211455;

  /// @notice The denominator component for values specified in basis points.
  uint constant BASIS_POINTS_DEN = 10000;

  /// @notice The max `totalSupply + burnedSupply`
  /// @dev This limit ensures that the DAT's formulas do not overflow (<MAX_BEFORE_SQUARE/2)
  uint constant MAX_SUPPLY = 10 ** 38;

  /**
   * Data specific to our token business logic
   */

  /// @notice The contract for transfer authorizations, if any.
  Whitelist public whitelist;

  /// @notice The total number of burned FAIR tokens, excluding tokens burned from a `Sell` action in the DAT.
  uint public burnedSupply;

  /**
   * Data storage required by the ERC-20 token standard
   */
  // TODO switch to the open zeppelin implementation

  /// @notice Stores the `from` address to the `operator` address to the max value that operator is authorized to transfer.
  /// @dev not public: exposed via `allowance`
  mapping(address => mapping(address => uint)) allowances;

  /// @notice Returns the account balance of another account with address _owner.
  mapping(address => uint) public balanceOf;

  /// @notice The total number of tokens currently in circulation
  /// @dev This does not include the burnedSupply
  uint public totalSupply;

  /**
   * Metadata suggested by the ERC-20 token standard
   */
  // TODO switch to the open zeppelin implementation

  /// @notice Returns the name of the token - e.g. "MyToken".
  /// @dev Optional requirement from ERC-20.
  string public name;

  /// @notice Returns the symbol of the token. E.g. “HIX”.
  /// @dev Optional requirement from ERC-20
  string public symbol;

  /**
   * Data for DAT business logic
   */

  /// @notice Set if the FAIRs minted by the organization when it commits its revenues are
  /// automatically burnt (`true`) or not (`false`). Defaults to `false` meaning that there
  /// is no automatic burn.
  bool public autoBurn;

  /// @notice The address of the beneficiary organization which receives the investments.
  /// Points to the wallet of the organization.
  address public beneficiary;

  /// @notice The BigMath library we use
  BigDiv public bigDiv;

  /// @notice The Sqrt library we use
  Sqrt public sqrtContract;

  /// @notice The buy slope of the bonding curve.
  /// Does not affect the financial model, only the granularity of FAIR.
  /// @dev This is the numerator component of the fractional value.
  uint public buySlopeNum;

  /// @notice The buy slope of the bonding curve.
  /// Does not affect the financial model, only the granularity of FAIR.
  /// @dev This is the denominator component of the fractional value.
  uint public buySlopeDen;

  /// @notice The address from which the updatable variables can be updated
  address public control;

  /// @notice The address of the token used as reserve in the bonding curve
  /// (e.g. the DAI contract). Use ETH if 0.
  IERC20 public currency;

  /// @notice The address where fees are sent.
  address public feeCollector;

  /// @notice The percent fee collected each time new FAIR are issued expressed in basis points.
  uint public feeBasisPoints;

  /// @notice The initial fundraising goal (expressed in FAIR) to start the c-org.
  /// `0` means that there is no initial fundraising and the c-org immediately moves to run state.
  uint public initGoal;

  /// @notice A map with all investors in init state using address as a key and amount as value.
  /// @dev This structure's purpose is to make sure that only investors can withdraw their money if init_goal is not reached.
  mapping(address => uint) public initInvestors;

  /// @notice The initial number of FAIR created at initialization for the beneficiary.
  /// @dev Most organizations will move these tokens into vesting contract(s)
  uint public initReserve;

  /// @notice The investment reserve of the c-org. Defines the percentage of the value invested that is
  /// automatically funneled and held into the buyback_reserve expressed in basis points.
  uint public investmentReserveBasisPoints;

  /// @notice The earliest date/time (in seconds) that the DAT may enter the `CLOSE` state, ensuring
  /// that if the DAT reaches the `RUN` state it will remain running for at least this period of time.
  /// @dev This value may be increased anytime by the control account
  uint public openUntilAtLeast;

  /// @notice The minimum amount of `currency` investment accepted.
  uint public minInvestment;

  /// @notice The revenue commitment of the organization. Defines the percentage of the value paid through the contract
  /// that is automatically funneled and held into the buyback_reserve expressed in basis points.
  uint public revenueCommitmentBasisPoints;

  /// @notice The current state of the contract.
  /// @dev See the constants above for possible state values.
  uint public state;

  /**
   * Buyback reserve
   */

  /// @notice The total amount of currency value currently locked in the contract and available to sellers.
  function buybackReserve() public view returns (uint)
  {
    uint reserve = self.balance;
    if(self.currency != address(0))
    {
      reserve = self.currency.balanceOf(self);
    }

    if(reserve > MAX_BEFORE_SQUARE)
    {
      /// Math: If the reserve becomes excessive, cap the value to prevent overflowing in other formulas
      return MAX_BEFORE_SQUARE;
    }

    return reserve;
  }

  /// Functions required for the whitelist
  ##################################################

  @private
  @constant
  def _detectTransferRestriction(
    _from: address,
    _to: address,
    _value: uint
  ) -> uint:
    if(self.whitelist != address(0)): /// This is not set for the minting of initialReserve
      return self.whitelist.detectTransferRestriction(_from, _to, _value)
    return 0

  @private
  def _authorizeTransfer(
    _from: address,
    _to: address,
    _value: uint,
    _isSell: bool
  ):
    if(self.whitelist != address(0)): /// This is not set for the minting of initialReserve
      self.whitelist.authorizeTransfer(_from, _to, _value, _isSell)


  /// Functions required by the ERC-20 token standard
  ##################################################

  @private
  def _send(
    _from: address,
    _to: address,
    _amount: uint
  ):
    """
    @dev Moves tokens from one account to another if authorized.
    We have disabled the call hooks for ERC-20 style transfers in order to ensure other contracts interfacing with
    FAIR tokens (e.g. Uniswap) remain secure.
    """
    assert _from != address(0), "ERC20: send from the zero address"
    assert _to != address(0), "ERC20: send to the zero address"
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
  ) -> uint:
    """
    @notice Returns the amount which `_spender` is still allowed to withdraw from `_owner`.
    """
    return self.allowances[_owner][_spender]

  @public
  @constant
  def decimals() -> uint:
    """
    @notice Returns the number of decimals the token uses - e.g. 8, means to divide
    the token amount by 100000000 to get its user representation.
    @dev Hardcoded to 18
    """
    return 18

  @public
  def approve(
    _spender: address,
    _value: uint
  ) -> bool:
    """
    @notice Allows `_spender` to withdraw from your account multiple times, up to the `_value` amount.
    @dev If this function is called again it overwrites the current allowance with `_value`.
    """
    assert _spender != address(0), "ERC20: approve to the zero address"

    self.allowances[msg.sender][_spender] = _value
    log.Approval(msg.sender, _spender, _value)
    return True

  @public
  def transfer(
    _to: address,
    _value: uint
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
    _value: uint
  ) -> bool:
    """
    @notice Transfers `_value` amount of tokens from address `_from` to address `_to` if authorized.
    """
    self.allowances[_from][msg.sender] -= _value
    self._send(_from, _to, _value)
    return True


  /// Transaction Helpers

  @private
  def _burn(
    _from: address,
    _amount: uint,
    _isSell: bool
  ):
    """
    @dev Removes tokens from the circulating supply.
    """
    assert _from != address(0), "ERC20: burn from the zero address"

    self.balanceOf[_from] -= _amount
    self.totalSupply -= _amount

    self._authorizeTransfer(_from, address(0), _amount, _isSell)
    if(not _isSell):
      /// This is a burn
      assert self.state == STATE_RUN, "ONLY_DURING_RUN"
      self.burnedSupply += _amount

    log.Transfer(_from, address(0), _amount)

  @private
  def _collectInvestment(
    _from: address,
    _quantityToInvest: uint,
    _msgValue: uint(wei),
    _refundRemainder: bool
  ):
    """
    @notice Confirms the transfer of `_quantityToInvest` currency to the contract.
    """
    if(self.currency == address(0)): /// currency is ETH
      if(_refundRemainder):
        /// Math: if _msgValue was not sufficient then revert
        refund: uint(wei) = _msgValue - _quantityToInvest
        if(refund > 0):
          /// this call fails if we don't capture a response
          res: bytes[1] = raw_call(_from, b"", outsize=0, value=refund, gas=msg.gas)
      else:
        assert as_wei_value(_quantityToInvest, "wei") == _msgValue, "INCORRECT_MSG_VALUE"
    else: /// currency is ERC20
      assert _msgValue == 0, "DO_NOT_SEND_ETH"

      success: bool = self.currency.transferFrom(_from, self, _quantityToInvest)
      assert success, "ERC20_TRANSFER_FAILED"

  @private
  def _sendCurrency(
    _to: address,
    _amount: uint
  ):
    """
    @dev Send `_amount` currency from the contract to the `_to` account.
    """
    if(_amount > 0):
      if(self.currency == address(0)):
        /// this call fails if we don't capture a response
        res: bytes[1] = raw_call(_to, b"", outsize=0, value=as_wei_value(_amount, "wei"), gas=msg.gas)
      else:
        success: bool = self.currency.transfer(_to, as_unitless_number(_amount))
        assert success, "ERC20_TRANSFER_FAILED"

  @private
  def _mint(
    _to: address,
    _quantity: uint
  ):
    """
    @notice Called by the owner, which is the DAT contract, in order to mint tokens on `buy`.
    """
    assert _to != address(0), "INVALID_ADDRESS"
    assert _quantity > 0, "INVALID_QUANTITY"
    self._authorizeTransfer(address(0), _to, _quantity, False)

    self.totalSupply += _quantity
    /// Math: If this value got too large, the DAT may overflow on sell
    assert self.totalSupply + self.burnedSupply <= MAX_SUPPLY, "EXCESSIVE_SUPPLY"
    self.balanceOf[_to] += _quantity

    log.Transfer(address(0), _to, _quantity)

  /// Config / Control
  ##################################################

  @public
  def initialize(
    _initReserve: uint,
    _currencyAddress: address,
    _initGoal: uint,
    _buySlopeNum: uint,
    _buySlopeDen: uint,
    _investmentReserveBasisPoints: uint
  ):
    """
    @notice Called once after deploy to set the initial configuration.
    None of the values provided here may change once initially set.
    @dev using the init pattern in order to support zos upgrades
    """
    assert self.control == address(0), "ALREADY_INITIALIZED"

    /// Set initGoal, which in turn defines the initial state
    if(_initGoal == 0):
      log.StateChange(self.state, STATE_RUN)
      self.state = STATE_RUN
    else:
      /// Math: If this value got too large, the DAT would overflow on sell
      assert _initGoal < MAX_SUPPLY, "EXCESSIVE_GOAL"
      self.initGoal = _initGoal

    assert _buySlopeNum > 0, "INVALID_SLOPE_NUM" /// 0 not supported
    assert _buySlopeDen > 0, "INVALID_SLOPE_DEN"
    assert _buySlopeNum < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_NUM" /// 0 not supported
    assert _buySlopeDen < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_DEN"
    self.buySlopeNum = _buySlopeNum
    self.buySlopeDen = _buySlopeDen
    assert _investmentReserveBasisPoints <= BASIS_POINTS_DEN, "INVALID_RESERVE" /// 100% or less
    self.investmentReserveBasisPoints = _investmentReserveBasisPoints /// 0 means all investments go to the beneficiary

    /// Set default values (which may be updated using `updateConfig`)
    self.minInvestment = as_unitless_number(as_wei_value(100, "ether"))
    self.beneficiary = msg.sender
    self.control = msg.sender
    self.feeCollector = msg.sender

    /// Save currency
    self.currencyAddress = _currencyAddress
    self.currency = ERC20(_currencyAddress)

    /// Mint the initial reserve
    if(_initReserve > 0):
      self.initReserve = _initReserve
      self._mint(self.beneficiary, self.initReserve)

  @public
  def updateConfig(
    _bigDiv: address,
    _sqrtContract: address,
    _whitelistAddress: address,
    _beneficiary: address,
    _control: address,
    _feeCollector: address,
    _feeBasisPoints: uint,
    _autoBurn: bool,
    _revenueCommitmentBasisPoints: uint,
    _minInvestment: uint,
    _openUntilAtLeast: uint,
    _name: string[64],
    _symbol: string[32]
  ):
    /// This assert also confirms that initialize has been called.
    assert msg.sender == self.control, "CONTROL_ONLY"

    self.name = _name
    self.symbol = _symbol

    assert _whitelistAddress != address(0), "INVALID_ADDRESS"
    self.whitelistAddress = _whitelistAddress
    self.whitelist = Whitelist(_whitelistAddress)

    assert _bigDiv != address(0), "INVALID_ADDRESS"
    assert _bigDiv != address(0), "INVALID_ADDRESS"
    self.bigDivAddress = _bigDiv
    self.bigDiv = IBigDiv(_bigDiv)
    self.sqrtAddress = _sqrtContract
    self.sqrtContract = ISqrt(_sqrtContract)

    assert _control != address(0), "INVALID_ADDRESS"
    self.control = _control

    assert _feeCollector != address(0), "INVALID_ADDRESS"
    self.feeCollector = _feeCollector

    self.autoBurn = _autoBurn

    assert _revenueCommitmentBasisPoints <= BASIS_POINTS_DEN, "INVALID_COMMITMENT" /// 100% or less
    assert _revenueCommitmentBasisPoints >= self.revenueCommitmentBasisPoints, "COMMITMENT_MAY_NOT_BE_REDUCED"
    self.revenueCommitmentBasisPoints = _revenueCommitmentBasisPoints /// 0 means all renvue goes to the beneficiary

    assert _feeBasisPoints <= BASIS_POINTS_DEN, "INVALID_FEE" /// 100% or less
    self.feeBasisPoints = _feeBasisPoints /// 0 means no fee

    assert _minInvestment > 0, "INVALID_MIN_INVESTMENT"
    self.minInvestment = _minInvestment

    assert _openUntilAtLeast >= self.openUntilAtLeast, "OPEN_UNTIL_MAY_NOT_BE_REDUCED"
    self.openUntilAtLeast = _openUntilAtLeast

    if(self.beneficiary != _beneficiary):
      assert _beneficiary != address(0), "INVALID_ADDRESS"
      tokens: uint = self.balanceOf[self.beneficiary]
      self.initInvestors[_beneficiary] += self.initInvestors[self.beneficiary]
      self.initInvestors[self.beneficiary] = 0
      if(tokens > 0):
        self._send(self.beneficiary, _beneficiary, tokens)
      self.beneficiary = _beneficiary

    log.UpdateConfig(
      _bigDiv,
      _sqrtContract,
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

  /// Functions for our business logic
  ##################################################

  @public
  def burn(
    _amount: uint
  ):
    """
    @notice Burn the amount of tokens from the address msg.sender if authorized.
    @dev Note that this is not the same as a `sell` via the DAT.
    """
    self._burn(msg.sender, _amount, False)

  /// Buy

  @private
  def _distributeInvestment(
    _value: uint
  ):
    """
    @dev Distributes _value currency between the buybackReserve, beneficiary, and feeCollector.
    """
    /// Rounding favors buybackReserve, then beneficiary, and feeCollector is last priority.

    /// Math: if investment value is < (2^256 - 1) / 10000 this will never overflow.
    /// Except maybe with a huge single investment, but they can try again with multiple smaller investments.
    reserve: uint = self.investmentReserveBasisPoints * _value
    reserve /= BASIS_POINTS_DEN
    reserve = _value - reserve
    /// Math: since reserve is <= the investment value, this will never overflow.
    fee: uint = reserve * self.feeBasisPoints
    fee /= BASIS_POINTS_DEN

    /// Math: since feeBasisPoints is <= BASIS_POINTS_DEN, this will never underflow.
    self._sendCurrency(self.beneficiary, reserve - fee)
    self._sendCurrency(self.feeCollector, fee)

  @private
  @constant
  def _estimateBuyValue(
    _currencyValue: uint
  ) -> uint:
    """
    @notice Calculate how many FAIR tokens you would buy with the given amount of currency if `buy` was called now.
    @param _currencyValue How much currency to spend in order to buy FAIR.
    """
    if(_currencyValue < self.minInvestment):
      return 0

    /// Calculate the tokenValue for this investment
    tokenValue: uint = 0
    if(self.state == STATE_INIT):
      /// Math: worst case
      /// 2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
      /// / MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
      tokenValue = self.bigDiv.bigDiv2x1(
        2 * _currencyValue, self.buySlopeDen,
        self.initGoal * self.buySlopeNum,
        False
      )
      if(tokenValue > self.initGoal):
        return 0
    elif(self.state == STATE_RUN):
      supply: uint = self.totalSupply + self.burnedSupply
      /// Math: worst case
      /// 2 * MAX_BEFORE_SQUARE / 2 * MAX_BEFORE_SQUARE
      /// / MAX_BEFORE_SQUARE
      tokenValue = 2 * _currencyValue * self.buySlopeDen
      tokenValue /= self.buySlopeNum
      
      tokenValue += supply * supply
      tokenValue = self.sqrtContract.sqrtUint(tokenValue)

      /// Math: small chance of underflow due to possible rounding in sqrt
      if(tokenValue > supply):
        tokenValue -= supply
      else:
        tokenValue = 0
    else:
      return 0 /// invalid state

    return tokenValue

  @public
  @constant
  def estimateBuyValue(
    _currencyValue: uint
  ) -> uint:
    return self._estimateBuyValue(_currencyValue)

  @public
  @payable
  def buy(
    _to: address,
    _currencyValue: uint,
    _minTokensBought: uint
  ):
    """
    @notice Purchase FAIR tokens with the given amount of currency.
    @param _to The account to receive the FAIR tokens from this purchase.
    @param _currencyValue How much currency to spend in order to buy FAIR.
    @param _minTokensBought Buy at least this many FAIR tokens or the transaction reverts.
    @dev _minTokensBought is necessary as the price will change if some elses transaction mines after
    yours was submitted.
    """
    assert _to != address(0), "INVALID_ADDRESS"
    assert _minTokensBought > 0, "MUST_BUY_AT_LEAST_1"

    /// Calculate the tokenValue for this investment
    tokenValue: uint = self._estimateBuyValue(_currencyValue)
    assert tokenValue >= _minTokensBought, "PRICE_SLIPPAGE"

    log.Buy(msg.sender, _to, _currencyValue, tokenValue)

    self._collectInvestment(msg.sender, _currencyValue, msg.value, False)

    /// Update state, initInvestors, and distribute the investment when appropriate
    if(self.state == STATE_INIT):
      /// Math worst case: MAX_BEFORE_SQUARE
      self.initInvestors[_to] += tokenValue
      /// Math worst case:
      /// MAX_BEFORE_SQUARE + MAX_BEFORE_SQUARE
      if(self.totalSupply + tokenValue - self.initReserve >= self.initGoal):
        log.StateChange(self.state, STATE_RUN)
        self.state = STATE_RUN
        /// Math worst case:
        /// MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2
        /// / MAX_BEFORE_SQUARE * 2
        beneficiaryContribution: uint = self.bigDiv.bigDiv2x1(
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
        self._burn(self.beneficiary, tokenValue, False) /// must mint before this call

  /// Sell

  @private
  @constant
  def _estimateSellValue(
    _quantityToSell: uint
  ) -> uint:
    buybackReserve: uint = self._buybackReserve()

    /// Calculate currencyValue for this sale
    currencyValue: uint = 0
    if(self.state == STATE_RUN):
      supply: uint = self.totalSupply + self.burnedSupply

      /// buyback_reserve = r
      /// total_supply = t
      /// burnt_supply = b
      /// amount = a
      /// source: (t+b)*a*(2*r)/((t+b)^2)-(((2*r)/((t+b)^2)*a^2)/2)+((2*r)/((t+b)^2)*a*b^2)/(2*(t))
      /// imp: (a b^2 r)/(t (b + t)^2) + (2 a r)/(b + t) - (a^2 r)/(b + t)^2

      /// Math: burnedSupply is capped in FAIR such that the square will never overflow
      /// Math worst case:
      /// MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
      /// / MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
      currencyValue = self.bigDiv.bigDiv2x2(
        _quantityToSell * buybackReserve, self.burnedSupply * self.burnedSupply,
        self.totalSupply, supply * supply
      )
      /// Math: worst case currencyValue is MAX_BEFORE_SQUARE (max reserve, 1 supply)

      /// Math worst case:
      /// 2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
      temp: uint = 2 * _quantityToSell * buybackReserve
      temp /= supply
      /// Math: worst-case temp is MAX_BEFORE_SQUARE (max reserve, 1 supply)

      /// Math: considering the worst-case for currencyValue and temp, this can never overflow
      currencyValue += temp

      /// Math: worst case
      /// MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
      /// / MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
      currencyValue -= self.bigDiv.bigDiv2x1(
        _quantityToSell * _quantityToSell, buybackReserve,
        supply * supply,
        True
      )
    elif(self.state == STATE_CLOSE):
      /// Math worst case
      /// MAX_BEFORE_SQUARE / 2 * MAX_BEFORE_SQUARE
      currencyValue = _quantityToSell * buybackReserve
      currencyValue /= self.totalSupply
    else: /// STATE_INIT or STATE_CANCEL
      /// Math worst case:
      /// MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
      currencyValue = _quantityToSell * buybackReserve
      /// Math: FAIR blocks initReserve from being burned unless we reach the RUN state which prevents an underflow
      currencyValue /= self.totalSupply - self.initReserve

    return currencyValue

  @public
  @constant
  def estimateSellValue(
    _quantityToSell: uint
  ) -> uint:
    return self._estimateSellValue(_quantityToSell)

  @private
  def _sell(
    _from: address,
    _to: address,
    _quantityToSell: uint,
    _minCurrencyReturned: uint,
    _hasReceivedFunds: bool
  ):
    assert _from != self.beneficiary or self.state >= STATE_CLOSE, "BENEFICIARY_ONLY_SELL_IN_CLOSE_OR_CANCEL"
    assert _minCurrencyReturned > 0, "MUST_SELL_AT_LEAST_1"

    currencyValue: uint = self._estimateSellValue(_quantityToSell)
    assert currencyValue >= _minCurrencyReturned, "PRICE_SLIPPAGE"

    if(self.state == STATE_INIT or self.state == STATE_CANCEL):
      self.initInvestors[_from] -= _quantityToSell

    /// Distribute funds
    if(_hasReceivedFunds):
      self._burn(self, _quantityToSell, True)
    else:
      self._burn(_from, _quantityToSell, True)

    self._sendCurrency(_to, currencyValue)
    log.Sell(_from, _to, currencyValue, _quantityToSell)

  @public
  def sell(
    _to: address,
    _quantityToSell: uint,
    _minCurrencyReturned: uint
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

  /// Pay

  @private
  @constant
  def _estimatePayValue(
    _currencyValue: uint
  ) -> uint:
    /// buy_slope = n/d
    /// revenue_commitment = c/g
    /// sqrt(
    ///  (2 a c d)
    ///  /
    ///  (g n)
    ///  + s^2
    /// ) - s

    supply: uint = self.totalSupply + self.burnedSupply

    /// Math: worst case
    /// 2 * MAX_BEFORE_SQUARE/2 * 10000 * MAX_BEFORE_SQUARE
    /// / 10000 * MAX_BEFORE_SQUARE
    tokenValue: uint = self.bigDiv.bigDiv2x1(
      2 * _currencyValue * self.revenueCommitmentBasisPoints, self.buySlopeDen,
      BASIS_POINTS_DEN * self.buySlopeNum,
      False
    )

    tokenValue += supply * supply
    tokenValue = self.sqrtContract.sqrtUint(tokenValue)

    if(tokenValue > supply):
      tokenValue -= supply
    else:
      tokenValue = 0

    return tokenValue

  @public
  @constant
  def estimatePayValue(
    _currencyValue: uint
  ) -> uint:
    return self._estimatePayValue(_currencyValue)

  @private
  def _pay(
    _from: address,
    _to: address,
    _currencyValue: uint
  ):
    """
    @dev Pay the organization on-chain.
    @param _from The account which issued the transaction and paid the currencyValue.
    @param _to The account which receives tokens for the contribution.
    @param _currencyValue How much currency which was paid.
    """
    assert _from != address(0), "INVALID_ADDRESS"
    assert _currencyValue > 0, "MISSING_CURRENCY"
    assert self.state == STATE_RUN, "INVALID_STATE"

    /// Send a portion of the funds to the beneficiary, the rest is added to the buybackReserve
    /// Math: if _currencyValue is < (2^256 - 1) / 10000 this will never overflow
    reserve: uint = _currencyValue * self.investmentReserveBasisPoints
    reserve /= BASIS_POINTS_DEN

    tokenValue: uint = self._estimatePayValue(_currencyValue)

    /// Update the to address to the beneficiary if the currency value would fail
    to: address = _to
    if(to == address(0)):
      to = self.beneficiary
    elif(self._detectTransferRestriction(address(0), _to, tokenValue) != 0):
      to = self.beneficiary

    /// Math: this will never underflow since investmentReserveBasisPoints is capped to BASIS_POINTS_DEN
    self._sendCurrency(self.beneficiary, _currencyValue - reserve)

    /// Distribute tokens
    if(tokenValue > 0):
      self._mint(to, tokenValue)
      if(to == self.beneficiary and self.autoBurn):
        self._burn(self.beneficiary, tokenValue, False) /// must mint before this call

    log.Pay(_from, _to, _currencyValue, tokenValue)

  @public
  @payable
  def pay(
    _to: address,
    _currencyValue: uint
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

  /// Close

  @private
  @constant
  def _estimateExitFee(
    _msgValue: uint(wei)
  ) -> uint:
    exitFee: uint = 0

    if(self.state == STATE_RUN):
      buybackReserve: uint = self._buybackReserve()
      buybackReserve -= as_unitless_number(_msgValue)

      /// Source: t*(t+b)*(n/d)-r
      /// Implementation: (b n t)/d + (n t^2)/d - r

      /// Math worst case:
      /// MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
      exitFee = self.bigDiv.bigDiv2x1(
        self.burnedSupply * self.buySlopeNum, self.totalSupply,
        self.buySlopeDen,
        False
      )
      /// Math worst case:
      /// MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
      exitFee += self.bigDiv.bigDiv2x1(
        self.buySlopeNum * self.totalSupply, self.totalSupply,
        self.buySlopeDen,
        False
      )
      /// Math: this if condition avoids a potential overflow
      if(exitFee <= buybackReserve):
        exitFee = 0
      else:
        exitFee -= buybackReserve

    return exitFee

  @public
  @constant
  def estimateExitFee(
    _msgValue: uint(wei)
  ) -> uint:
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

    exitFee: uint = 0

    if(self.state == STATE_INIT):
      /// Allow the org to cancel anytime if the initGoal was not reached.
      log.StateChange(self.state, STATE_CANCEL)
      self.state = STATE_CANCEL
    elif(self.state == STATE_RUN):
      /// Collect the exitFee and close the c-org.
      assert self.openUntilAtLeast <= block.timestamp, "TOO_EARLY"

      exitFee = self._estimateExitFee(msg.value)

      log.StateChange(self.state, STATE_CLOSE)
      self.state = STATE_CLOSE

      self._collectInvestment(msg.sender, exitFee, msg.value, True)
    else:
      assert False, "INVALID_STATE"

    log.Close(exitFee)
}