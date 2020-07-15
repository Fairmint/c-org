pragma solidity 0.5.17;

import "./interfaces/IWhitelist.sol";
import "./interfaces/IERC20Detailed.sol";
import "./math/BigDiv.sol";
import "./math/Sqrt.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/Address.sol";


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
  is ERC20, ERC20Detailed
{
  using SafeMath for uint;
  using Sqrt for uint;
  using SafeERC20 for IERC20;

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
  event Burn(
    address indexed _from,
    uint _fairValue
  );
  event Pay(
    address indexed _from,
    uint _currencyValue
  );
  event Close(
    uint _exitFee
  );
  event StateChange(
    uint _previousState,
    uint _newState
  );
  event UpdateConfig(
    address _whitelistAddress,
    address indexed _beneficiary,
    address indexed _control,
    address indexed _feeCollector,
    uint _revenueCommitmentBasisPoints,
    uint _feeBasisPoints,
    uint _minInvestment,
    uint _minDuration
  );

  /**
   * Constants
   */

  /// @notice The default state
  uint private constant STATE_INIT = 0;

  /// @notice The state after initGoal has been reached
  uint private constant STATE_RUN = 1;

  /// @notice The state after closed by the `beneficiary` account from STATE_RUN
  uint private constant STATE_CLOSE = 2;

  /// @notice The state after closed by the `beneficiary` account from STATE_INIT
  uint private constant STATE_CANCEL = 3;

  /// @notice When multiplying 2 terms, the max value is 2^128-1
  uint private constant MAX_BEFORE_SQUARE = 2**128 - 1;

  /// @notice The denominator component for values specified in basis points.
  uint private constant BASIS_POINTS_DEN = 10000;

  /// @notice The max `totalSupply() + burnedSupply`
  /// @dev This limit ensures that the DAT's formulas do not overflow (<MAX_BEFORE_SQUARE/2)
  uint private constant MAX_SUPPLY = 10 ** 38;

  /**
   * Data specific to our token business logic
   */

  /// @notice The contract for transfer authorizations, if any.
  IWhitelist public whitelist;

  /// @notice The total number of burned FAIR tokens, excluding tokens burned from a `Sell` action in the DAT.
  uint public burnedSupply;

  /**
   * Data for DAT business logic
   */

  /// @dev unused slot which remains to ensure compatible upgrades
  bool private __autoBurn;

  /// @notice The address of the beneficiary organization which receives the investments.
  /// Points to the wallet of the organization.
  address payable public beneficiary;

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
  address payable public feeCollector;

  /// @notice The percent fee collected each time new FAIR are issued expressed in basis points.
  uint public feeBasisPoints;

  /// @notice The initial fundraising goal (expressed in FAIR) to start the c-org.
  /// `0` means that there is no initial fundraising and the c-org immediately moves to run state.
  uint public initGoal;

  /// @notice A map with all investors in init state using address as a key and amount as value.
  /// @dev This structure's purpose is to make sure that only investors can withdraw their money if init_goal is not reached.
  mapping(address => uint) public initInvestors;

  /// @notice The initial number of FAIR created at initialization for the beneficiary.
  /// Technically however, this variable is not a constant as we must always have
  ///`init_reserve>=total_supply+burnt_supply` which means that `init_reserve` will be automatically
  /// decreased to equal `total_supply+burnt_supply` in case `init_reserve>total_supply+burnt_supply`
  /// after an investor sells his FAIRs.
  /// @dev Organizations may move these tokens into vesting contract(s)
  uint public initReserve;

  /// @notice The investment reserve of the c-org. Defines the percentage of the value invested that is
  /// automatically funneled and held into the buyback_reserve expressed in basis points.
  uint public investmentReserveBasisPoints;

  /// @dev unused slot which remains to ensure compatible upgrades
  uint private __openUntilAtLeast;

  /// @notice The minimum amount of `currency` investment accepted.
  uint public minInvestment;

  /// @notice The revenue commitment of the organization. Defines the percentage of the value paid through the contract
  /// that is automatically funneled and held into the buyback_reserve expressed in basis points.
  uint public revenueCommitmentBasisPoints;

  /// @notice The current state of the contract.
  /// @dev See the constants above for possible state values.
  uint public state;

  /// @dev If this value changes we need to reconstruct the DOMAIN_SEPARATOR
  string public constant version = "3";
  // --- EIP712 niceties ---
  // Original source: https://etherscan.io/address/0x6b175474e89094c44da98b954eedeac495271d0f#code
  mapping (address => uint) public nonces;
  bytes32 public DOMAIN_SEPARATOR;
  // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
  bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  // The success fee (expressed in currency) that will be earned by setupFeeRecipient as soon as initGoal
  // is reached. We must have setup_fee <= buy_slope*init_goal^(2)/2
  uint public setupFee;

  // The recipient of the setup_fee once init_goal is reached
  address payable public setupFeeRecipient;

  /// @notice The minimum time before which the c-org contract cannot be closed once the contract has
  /// reached the `run` state.
  /// @dev When updated, the new value of `minimum_duration` cannot be earlier than the previous value.
  uint public minDuration;

  /// @notice Initialized at `0` and updated when the contract switches from `init` state to `run` state
  /// with the current timestamp.
  uint public runStartedOn;

  /// @notice The max possible value
  uint private constant MAX_UINT = 2**256 - 1;

  // keccak256("PermitBuy(address from,address to,uint256 currencyValue,uint256 minTokensBought,uint256 nonce,uint256 deadline)");
  bytes32 public constant PERMIT_BUY_TYPEHASH = 0xaf42a244b3020d6a2253d9f291b4d3e82240da42b22129a8113a58aa7a3ddb6a;

  // keccak256("PermitSell(address from,address to,uint256 quantityToSell,uint256 minCurrencyReturned,uint256 nonce,uint256 deadline)");
  bytes32 public constant PERMIT_SELL_TYPEHASH = 0x5dfdc7fb4c68a4c249de5e08597626b84fbbe7bfef4ed3500f58003e722cc548;

  modifier authorizeTransfer(
    address _from,
    address _to,
    uint _value,
    bool _isSell
  )
  {
    if(address(whitelist) != address(0))
    {
      // This is not set for the minting of initialReserve
      whitelist.authorizeTransfer(_from, _to, _value, _isSell);
    }
    _;
  }

  /**
   * Buyback reserve
   */

  /// @notice The total amount of currency value currently locked in the contract and available to sellers.
  function buybackReserve() public view returns (uint)
  {
    uint reserve = address(this).balance;
    if(address(currency) != address(0))
    {
      reserve = currency.balanceOf(address(this));
    }

    if(reserve > MAX_BEFORE_SQUARE)
    {
      /// Math: If the reserve becomes excessive, cap the value to prevent overflowing in other formulas
      return MAX_BEFORE_SQUARE;
    }

    return reserve;
  }

  /**
   * Functions required by the ERC-20 token standard
   */

  /// @dev Moves tokens from one account to another if authorized.
  function _transfer(
    address _from,
    address _to,
    uint _amount
  ) internal
    authorizeTransfer(_from, _to, _amount, false)
  {
    require(state != STATE_INIT || _from == beneficiary, "ONLY_BENEFICIARY_DURING_INIT");
    super._transfer(_from, _to, _amount);
  }

  /// @dev Removes tokens from the circulating supply.
  function _burn(
    address _from,
    uint _amount,
    bool _isSell
  ) internal
    authorizeTransfer(_from, address(0), _amount, _isSell)
  {
    super._burn(_from, _amount);

    if(!_isSell)
    {
      // This is a burn
      require(state == STATE_RUN, "ONLY_DURING_RUN");
      // SafeMath not required as we cap how high this value may get during mint
      burnedSupply += _amount;
      emit Burn(_from, _amount);
    }
  }

  /// @notice Called to mint tokens on `buy`.
  function _mint(
    address _to,
    uint _quantity
  ) internal
    authorizeTransfer(address(0), _to, _quantity, false)
  {
    super._mint(_to, _quantity);

    // Math: If this value got too large, the DAT may overflow on sell
    require(totalSupply().add(burnedSupply) <= MAX_SUPPLY, "EXCESSIVE_SUPPLY");
  }

  /**
   * Transaction Helpers
   */

  /// @notice Confirms the transfer of `_quantityToInvest` currency to the contract.
  function _collectInvestment(
    address payable _from,
    uint _quantityToInvest,
    uint _msgValue,
    bool _refundRemainder
  ) private
  {
    if(address(currency) == address(0))
    {
      // currency is ETH
      if(_refundRemainder)
      {
        // Math: if _msgValue was not sufficient then revert
        uint refund = _msgValue.sub(_quantityToInvest);
        if(refund > 0)
        {
          Address.sendValue(msg.sender, refund);
        }
      }
      else
      {
        require(_quantityToInvest == _msgValue, "INCORRECT_MSG_VALUE");
      }
    }
    else
    {
      // currency is ERC20
      require(_msgValue == 0, "DO_NOT_SEND_ETH");

      currency.safeTransferFrom(_from, address(this), _quantityToInvest);
    }
  }

  /// @dev Send `_amount` currency from the contract to the `_to` account.
  function _transferCurrency(
    address payable _to,
    uint _amount
  ) private
  {
    if(_amount > 0)
    {
      if(address(currency) == address(0))
      {
        Address.sendValue(_to, _amount);
      }
      else
      {
        currency.safeTransfer(_to, _amount);
      }
    }
  }

  /**
   * Config / Control
   */

  /// @notice Called once after deploy to set the initial configuration.
  /// None of the values provided here may change once initially set.
  /// @dev using the init pattern in order to support zos upgrades
  function initialize(
    uint _initReserve,
    address _currencyAddress,
    uint _initGoal,
    uint _buySlopeNum,
    uint _buySlopeDen,
    uint _investmentReserveBasisPoints,
    uint _setupFee,
    address payable _setupFeeRecipient,
    string memory _name,
    string memory _symbol
  ) public
  {
    // The ERC-20 implementation will confirm initialize is only run once
    ERC20Detailed.initialize(_name, _symbol, 18);

    // Set initGoal, which in turn defines the initial state
    if(_initGoal == 0)
    {
      emit StateChange(state, STATE_RUN);
      state = STATE_RUN;
      runStartedOn = block.timestamp;
    }
    else
    {
      // Math: If this value got too large, the DAT would overflow on sell
      require(_initGoal < MAX_SUPPLY, "EXCESSIVE_GOAL");
      initGoal = _initGoal;
    }

    require(_buySlopeNum > 0, "INVALID_SLOPE_NUM");
    require(_buySlopeDen > 0, "INVALID_SLOPE_DEN");
    require(_buySlopeNum < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_NUM");
    require(_buySlopeDen < MAX_BEFORE_SQUARE, "EXCESSIVE_SLOPE_DEN");
    buySlopeNum = _buySlopeNum;
    buySlopeDen = _buySlopeDen;
    // 100% or less
    require(_investmentReserveBasisPoints <= BASIS_POINTS_DEN, "INVALID_RESERVE");
    investmentReserveBasisPoints = _investmentReserveBasisPoints;

    // Setup Fee
    require(_setupFee == 0 || _setupFeeRecipient != address(0), "MISSING_SETUP_FEE_RECIPIENT");
    require(_setupFeeRecipient == address(0) || _setupFee != 0, "MISSING_SETUP_FEE");
    // setup_fee <= (n/d)*(g^2)/2
    uint initGoalInCurrency = _initGoal * _initGoal;
    initGoalInCurrency = initGoalInCurrency.mul(_buySlopeNum);
    initGoalInCurrency /= 2 * _buySlopeDen;
    require(_setupFee <= initGoalInCurrency, "EXCESSIVE_SETUP_FEE");
    setupFee = _setupFee;
    setupFeeRecipient = _setupFeeRecipient;

    // Set default values (which may be updated using `updateConfig`)
    uint decimals = 18;
    if(_currencyAddress != address(0))
    {
      decimals = IERC20Detailed(_currencyAddress).decimals();
    }
    minInvestment = 100 * 10 ** decimals;
    beneficiary = msg.sender;
    control = msg.sender;
    feeCollector = msg.sender;

    // Save currency
    currency = IERC20(_currencyAddress);

    // Mint the initial reserve
    if(_initReserve > 0)
    {
      initReserve = _initReserve;
      _mint(beneficiary, initReserve);
    }

    initializeDomainSeparator();
  }

  /// @notice Used to initialize the domain separator used in meta-transactions
  /// @dev This is separate from `initialize` to allow upgraded contracts to update the version
  /// There is no harm in calling this multiple times / no permissions required
  function initializeDomainSeparator() public
  {
    uint id;
    // solium-disable-next-line
    assembly
    {
      id := chainid()
    }
    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256(bytes(name())),
        keccak256(bytes(version)),
        id,
        address(this)
      )
    );
  }

  /// @notice A temporary function to set `runStartedOn`, to be used by contracts which were
  /// already deployed before this feature was introduced.
  /// @dev This function will be removed once known users have called the function.
  function initializeRunStartedOn(
    uint _runStartedOn
  ) external
  {
    require(msg.sender == control, "CONTROL_ONLY");
    require(state == STATE_RUN, "ONLY_CALL_IN_RUN");
    require(runStartedOn == 0, "ONLY_CALL_IF_NOT_AUTO_SET");
    require(_runStartedOn <= block.timestamp, "DATE_MUST_BE_IN_PAST");

    runStartedOn = _runStartedOn;
  }

  function updateConfig(
    address _whitelistAddress,
    address payable _beneficiary,
    address _control,
    address payable _feeCollector,
    uint _feeBasisPoints,
    uint _revenueCommitmentBasisPoints,
    uint _minInvestment,
    uint _minDuration
  ) public
  {
    // This require(also confirms that initialize has been called.
    require(msg.sender == control, "CONTROL_ONLY");

    // address(0) is okay
    whitelist = IWhitelist(_whitelistAddress);

    require(_control != address(0), "INVALID_ADDRESS");
    control = _control;

    require(_feeCollector != address(0), "INVALID_ADDRESS");
    feeCollector = _feeCollector;

    require(_revenueCommitmentBasisPoints <= BASIS_POINTS_DEN, "INVALID_COMMITMENT");
    require(_revenueCommitmentBasisPoints >= revenueCommitmentBasisPoints, "COMMITMENT_MAY_NOT_BE_REDUCED");
    revenueCommitmentBasisPoints = _revenueCommitmentBasisPoints;

    require(_feeBasisPoints <= BASIS_POINTS_DEN, "INVALID_FEE");
    feeBasisPoints = _feeBasisPoints;

    require(_minInvestment > 0, "INVALID_MIN_INVESTMENT");
    minInvestment = _minInvestment;

    require(_minDuration >= minDuration, "MIN_DURATION_MAY_NOT_BE_REDUCED");
    minDuration = _minDuration;

    if(beneficiary != _beneficiary)
    {
      require(_beneficiary != address(0), "INVALID_ADDRESS");
      uint tokens = balanceOf(beneficiary);
      initInvestors[_beneficiary] = initInvestors[_beneficiary].add(initInvestors[beneficiary]);
      initInvestors[beneficiary] = 0;
      if(tokens > 0)
      {
        _transfer(beneficiary, _beneficiary, tokens);
      }
      beneficiary = _beneficiary;
    }

    emit UpdateConfig(
      _whitelistAddress,
      _beneficiary,
      _control,
      _feeCollector,
      _revenueCommitmentBasisPoints,
      _feeBasisPoints,
      _minInvestment,
      _minDuration
    );
  }

  /**
   * Functions for our business logic
   */

  /// @notice Burn the amount of tokens from the address msg.sender if authorized.
  /// @dev Note that this is not the same as a `sell` via the DAT.
  function burn(
    uint _amount
  ) public
  {
    _burn(msg.sender, _amount, false);
  }

  /// @notice Burn the amount of tokens from the given address if approved.
  function burnFrom(
    address _from,
    uint _amount
  ) public
  {
    _approve(_from, msg.sender, allowance(_from, msg.sender).sub(_amount, "ERC20: burn amount exceeds allowance"));
    _burn(_from, _amount, false);
  }

  // Buy

  /// @dev Distributes _value currency between the buybackReserve, beneficiary, and feeCollector.
  function _distributeInvestment(
    uint _value
  ) private
  {
    // Rounding favors buybackReserve, then beneficiary, and feeCollector is last priority.

    // Math: if investment value is < (2^256 - 1) / 10000 this will never overflow.
    // Except maybe with a huge single investment, but they can try again with multiple smaller investments.
    uint reserve = investmentReserveBasisPoints.mul(_value);
    reserve /= BASIS_POINTS_DEN;
    reserve = _value.sub(reserve);
    uint fee = reserve.mul(feeBasisPoints);
    fee /= BASIS_POINTS_DEN;

    // Math: since feeBasisPoints is <= BASIS_POINTS_DEN, this will never underflow.
    _transferCurrency(beneficiary, reserve - fee);
    _transferCurrency(feeCollector, fee);
  }

  /// @notice Calculate how many FAIR tokens you would buy with the given amount of currency if `buy` was called now.
  /// @param _currencyValue How much currency to spend in order to buy FAIR.
  function estimateBuyValue(
    uint _currencyValue
  ) public view
    returns (uint)
  {
    if(_currencyValue < minInvestment)
    {
      return 0;
    }

    /// Calculate the tokenValue for this investment
    uint tokenValue;
    if(state == STATE_INIT)
    {
      uint currencyValue = _currencyValue;
      uint _totalSupply = totalSupply();
      // (buy_slope*init_goal)*(init_goal+init_reserve-total_supply)
      // n/d: buy_slope (MAX_BEFORE_SQUARE / MAX_BEFORE_SQUARE)
      // g: init_goal (MAX_BEFORE_SQUARE)
      // t: total_supply (MAX_BEFORE_SQUARE)
      // r: init_reserve (MAX_BEFORE_SQUARE)
      // source: ((n/d)*g)*(g+r-t)
      // impl: (g n (g + r - t))/(d)
      uint max = BigDiv.bigDiv2x1(
        initGoal * buySlopeNum,
        initGoal + initReserve - _totalSupply,
        buySlopeDen
      );
      if(currencyValue > max)
      {
        currencyValue = max;
      }
      // Math: worst case
      // MAX * MAX_BEFORE_SQUARE
      // / MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
      tokenValue = BigDiv.bigDiv2x1(
        currencyValue,
        buySlopeDen,
        initGoal * buySlopeNum
      );

      if(currencyValue != _currencyValue)
      {
        currencyValue = _currencyValue - max;
        // ((2*next_amount/buy_slope)+init_goal^2)^(1/2)-init_goal
        // a: next_amount | currencyValue
        // n/d: buy_slope (MAX_BEFORE_SQUARE / MAX_BEFORE_SQUARE)
        // g: init_goal (MAX_BEFORE_SQUARE/2)
        // r: init_reserve (MAX_BEFORE_SQUARE/2)
        // sqrt(((2*a/(n/d))+g^2)-g
        // sqrt((2 d a + n g^2)/n) - g

        // currencyValue == 2 d a
        uint temp = 2 * buySlopeDen;
        currencyValue = temp.mul(currencyValue);

        // temp == g^2
        temp = initGoal;
        temp *= temp;

        // temp == n g^2
        temp = temp.mul(buySlopeNum);

        // temp == (2 d a) + n g^2
        temp = currencyValue.add(temp);

        // temp == (2 d a + n g^2)/n
        temp /= buySlopeNum;

        // temp == sqrt((2 d a + n g^2)/n)
        temp = temp.sqrt();

        // temp == sqrt((2 d a + n g^2)/n) - g
        temp -= initGoal;

        tokenValue = tokenValue.add(temp);
      }
    }
    else if(state == STATE_RUN)
    {
      // initReserve is reduced on sell as necessary to ensure that this line will not overflow
      uint supply = totalSupply() + burnedSupply - initReserve;
      // Math: worst case
      // MAX * 2 * MAX_BEFORE_SQUARE
      // / MAX_BEFORE_SQUARE
      tokenValue = BigDiv.bigDiv2x1(
        _currencyValue,
        2 * buySlopeDen,
        buySlopeNum
      );

      // Math: worst case MAX + (MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE)
      tokenValue = tokenValue.add(supply * supply);
      tokenValue = tokenValue.sqrt();

      // Math: small chance of underflow due to possible rounding in sqrt
      tokenValue = tokenValue.sub(supply);
    }
    else
    {
      // invalid state
      return 0;
    }

    return tokenValue;
  }

  function _buy(
    address payable _from,
    address _to,
    uint _currencyValue,
    uint _minTokensBought
  ) private
  {
    require(_to != address(0), "INVALID_ADDRESS");
    require(_minTokensBought > 0, "MUST_BUY_AT_LEAST_1");

    // Calculate the tokenValue for this investment
    uint tokenValue = estimateBuyValue(_currencyValue);
    require(tokenValue >= _minTokensBought, "PRICE_SLIPPAGE");

    emit Buy(_from, _to, _currencyValue, tokenValue);

    _collectInvestment(_from, _currencyValue, msg.value, false);

    // Update state, initInvestors, and distribute the investment when appropriate
    if(state == STATE_INIT)
    {
      // Math worst case: MAX_BEFORE_SQUARE
      initInvestors[_to] += tokenValue;
      // Math worst case:
      // MAX_BEFORE_SQUARE + MAX_BEFORE_SQUARE
      if(totalSupply() + tokenValue - initReserve >= initGoal)
      {
        emit StateChange(state, STATE_RUN);
        state = STATE_RUN;
        runStartedOn = block.timestamp;

        // Math worst case:
        // MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2
        // / MAX_BEFORE_SQUARE
        uint beneficiaryContribution = BigDiv.bigDiv2x1(
          initInvestors[beneficiary],
          buySlopeNum * initGoal,
          buySlopeDen
        );

        if(setupFee > 0)
        {
          _transferCurrency(setupFeeRecipient, setupFee);
          if(beneficiaryContribution > setupFee)
          {
            beneficiaryContribution -= setupFee;
          }
          else
          {
            beneficiaryContribution = 0;
          }
        }

        _distributeInvestment(buybackReserve().sub(beneficiaryContribution));
      }
    }
    else // implied: if(state == STATE_RUN)
    {
      if(_to != beneficiary)
      {
        _distributeInvestment(_currencyValue);
      }
    }

    _mint(_to, tokenValue);
  }

  /// @notice Purchase FAIR tokens with the given amount of currency.
  /// @param _to The account to receive the FAIR tokens from this purchase.
  /// @param _currencyValue How much currency to spend in order to buy FAIR.
  /// @param _minTokensBought Buy at least this many FAIR tokens or the transaction reverts.
  /// @dev _minTokensBought is necessary as the price will change if some elses transaction mines after
  /// yours was submitted.
  function buy(
    address _to,
    uint _currencyValue,
    uint _minTokensBought
  ) public payable
  {
    _buy(msg.sender, _to, _currencyValue, _minTokensBought);
  }

  /// @notice Allow users to sign a message authorizing a buy
  function permitBuy(
    address payable _from,
    address _to,
    uint _currencyValue,
    uint _minTokensBought,
    uint _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external
  {
    require(_deadline >= block.timestamp, "EXPIRED");
    bytes32 digest = keccak256(abi.encode(PERMIT_BUY_TYPEHASH, _from, _to, _currencyValue, _minTokensBought, nonces[_from]++, _deadline));
    digest = keccak256(
      abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        digest
      )
    );
    address recoveredAddress = ecrecover(digest, _v, _r, _s);
    require(recoveredAddress != address(0) && recoveredAddress == _from, "INVALID_SIGNATURE");
    _buy(_from, _to, _currencyValue, _minTokensBought);
  }

  /// Sell

  function estimateSellValue(
    uint _quantityToSell
  ) public view
    returns(uint)
  {
    uint reserve = buybackReserve();

    // Calculate currencyValue for this sale
    uint currencyValue;
    if(state == STATE_RUN)
    {
      uint supply = totalSupply() + burnedSupply;

      // buyback_reserve = r
      // total_supply = t
      // burnt_supply = b
      // amount = a
      // source: (t+b)*a*(2*r)/((t+b)^2)-(((2*r)/((t+b)^2)*a^2)/2)+((2*r)/((t+b)^2)*a*b^2)/(2*(t))
      // imp: (a b^2 r)/(t (b + t)^2) + (2 a r)/(b + t) - (a^2 r)/(b + t)^2

      // Math: burnedSupply is capped in FAIR such that the square will never overflow
      // Math worst case:
      // MAX * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
      // / MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
      currencyValue = BigDiv.bigDiv2x2(
        _quantityToSell.mul(reserve),
        burnedSupply * burnedSupply,
        totalSupply(), supply * supply
      );
      // Math: worst case currencyValue is MAX_BEFORE_SQUARE (max reserve, 1 supply)

      // Math worst case:
      // MAX * 2 * MAX_BEFORE_SQUARE
      uint temp = _quantityToSell.mul(2 * reserve);
      temp /= supply;
      // Math: worst-case temp is MAX_BEFORE_SQUARE (max reserve, 1 supply)

      // Math: considering the worst-case for currencyValue and temp, this can never overflow
      currencyValue += temp;

      // Math: worst case
      // MAX * MAX * MAX_BEFORE_SQUARE
      // / MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE/2
      temp = BigDiv.bigDiv2x1RoundUp(
        _quantityToSell.mul(_quantityToSell),
        reserve,
        supply * supply
      );
      if(currencyValue > temp)
      {
        currencyValue -= temp;
      }
      else
      {
        currencyValue = 0;
      }
    }
    else if(state == STATE_CLOSE)
    {
      // Math worst case
      // MAX * MAX_BEFORE_SQUARE
      currencyValue = _quantityToSell.mul(reserve);
      currencyValue /= totalSupply();
    }
    else
    {
      // STATE_INIT or STATE_CANCEL
      // Math worst case:
      // MAX * MAX_BEFORE_SQUARE
      currencyValue = _quantityToSell.mul(reserve);
      // Math: FAIR blocks initReserve from being burned unless we reach the RUN state which prevents an underflow
      currencyValue /= totalSupply() - initReserve;
    }

    return currencyValue;
  }

  function _sell(
    address _from,
    address payable _to,
    uint _quantityToSell,
    uint _minCurrencyReturned
  ) private
  {
    require(_from != beneficiary || state >= STATE_CLOSE, "BENEFICIARY_ONLY_SELL_IN_CLOSE_OR_CANCEL");
    require(_minCurrencyReturned > 0, "MUST_SELL_AT_LEAST_1");

    uint currencyValue = estimateSellValue(_quantityToSell);
    require(currencyValue >= _minCurrencyReturned, "PRICE_SLIPPAGE");

    if(state == STATE_INIT || state == STATE_CANCEL)
    {
      initInvestors[_from] = initInvestors[_from].sub(_quantityToSell);
    }

    _burn(_from, _quantityToSell, true);
    uint supply = totalSupply() + burnedSupply;
    if(supply < initReserve)
    {
      initReserve = supply;
    }

    _transferCurrency(_to, currencyValue);
    emit Sell(_from, _to, currencyValue, _quantityToSell);
  }

  /// @notice Sell FAIR tokens for at least the given amount of currency.
  /// @param _to The account to receive the currency from this sale.
  /// @param _quantityToSell How many FAIR tokens to sell for currency value.
  /// @param _minCurrencyReturned Get at least this many currency tokens or the transaction reverts.
  /// @dev _minCurrencyReturned is necessary as the price will change if some elses transaction mines after
  /// yours was submitted.
  function sell(
    address payable _to,
    uint _quantityToSell,
    uint _minCurrencyReturned
  ) public
  {
    _sell(msg.sender, _to, _quantityToSell, _minCurrencyReturned);
  }

  /// @notice Allow users to sign a message authorizing a sell
  function permitSell(
    address _from,
    address payable _to,
    uint _quantityToSell,
    uint _minCurrencyReturned,
    uint _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external
  {
    require(_deadline >= block.timestamp, "EXPIRED");
    bytes32 digest = keccak256(abi.encode(PERMIT_SELL_TYPEHASH, _from, _to, _quantityToSell, _minCurrencyReturned, nonces[_from]++, _deadline));
    digest = keccak256(
      abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        digest
      )
    );
    address recoveredAddress = ecrecover(digest, _v, _r, _s);
    require(recoveredAddress != address(0) && recoveredAddress == _from, "INVALID_SIGNATURE");
    _sell(_from, _to, _quantityToSell, _minCurrencyReturned);
  }

  /// Pay

  /// @dev Pay the organization on-chain.
  /// @param _currencyValue How much currency which was paid.
  function pay(
    uint _currencyValue
  ) public payable
  {
    _collectInvestment(msg.sender, _currencyValue, msg.value, false);
    require(state == STATE_RUN, "INVALID_STATE");
    require(_currencyValue > 0, "MISSING_CURRENCY");

    // Send a portion of the funds to the beneficiary, the rest is added to the buybackReserve
    // Math: if _currencyValue is < (2^256 - 1) / 10000 this will not overflow
    uint reserve = _currencyValue.mul(revenueCommitmentBasisPoints);
    reserve /= BASIS_POINTS_DEN;

    // Math: this will never underflow since revenueCommitmentBasisPoints is capped to BASIS_POINTS_DEN
    _transferCurrency(beneficiary, _currencyValue - reserve);

    emit Pay(msg.sender, _currencyValue);
  }

  /// @notice Pay the organization on-chain without minting any tokens.
  /// @dev This allows you to add funds directly to the buybackReserve.
  function () external payable
  {
    require(address(currency) == address(0), "ONLY_FOR_CURRENCY_ETH");
  }

  /// Close

  function estimateExitFee(
    uint _msgValue
  ) public view
    returns(uint)
  {
    uint exitFee;

    if(state == STATE_RUN)
    {
      uint reserve = buybackReserve();
      reserve = reserve.sub(_msgValue);

      // Source: t*(t+b)*(n/d)-r
      // Implementation: (b n t)/d + (n t^2)/d - r

      uint _totalSupply = totalSupply();

      // Math worst case:
      // MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE/2 * MAX_BEFORE_SQUARE
      exitFee = BigDiv.bigDiv2x1(
        _totalSupply,
        burnedSupply * buySlopeNum,
        buySlopeDen
      );
      // Math worst case:
      // MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE * MAX_BEFORE_SQUARE
      exitFee += BigDiv.bigDiv2x1(
        _totalSupply,
        buySlopeNum * _totalSupply,
        buySlopeDen
      );
      // Math: this if condition avoids a potential overflow
      if(exitFee <= reserve)
      {
        exitFee = 0;
      }
      else
      {
        exitFee -= reserve;
      }
    }

    return exitFee;
  }

  /// @notice Called by the beneficiary account to STATE_CLOSE or STATE_CANCEL the c-org,
  /// preventing any more tokens from being minted.
  /// @dev Requires an `exitFee` to be paid.  If the currency is ETH, include a little more than
  /// what appears to be required and any remainder will be returned to your account.  This is
  /// because another user may have a transaction mined which changes the exitFee required.
  /// For other `currency` types, the beneficiary account will be billed the exact amount required.
  function close() public payable
  {
    require(msg.sender == beneficiary, "BENEFICIARY_ONLY");

    uint exitFee = 0;

    if(state == STATE_INIT)
    {
      // Allow the org to cancel anytime if the initGoal was not reached.
      emit StateChange(state, STATE_CANCEL);
      state = STATE_CANCEL;
    }
    else if(state == STATE_RUN)
    {
      // Collect the exitFee and close the c-org.
      require(MAX_UINT - minDuration > runStartedOn, "MAY_NOT_CLOSE");
      require(minDuration + runStartedOn <= block.timestamp, "TOO_EARLY");

      exitFee = estimateExitFee(msg.value);

      emit StateChange(state, STATE_CLOSE);
      state = STATE_CLOSE;

      _collectInvestment(msg.sender, exitFee, msg.value, true);
    }
    else
    {
      revert("INVALID_STATE");
    }

    emit Close(exitFee);
  }

  // --- Approve by signature ---
  // EIP-2612
  // Original source: https://github.com/Uniswap/uniswap-v2-core/blob/master/contracts/UniswapV2ERC20.sol
  function permit(
    address owner,
    address spender,
    uint value,
    uint deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external
  {
    require(deadline >= block.timestamp, "EXPIRED");
    bytes32 digest = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline));
    digest = keccak256(
      abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        digest
      )
    );
    address recoveredAddress = ecrecover(digest, v, r, s);
    require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNATURE");
    _approve(owner, spender, value);
  }
}
