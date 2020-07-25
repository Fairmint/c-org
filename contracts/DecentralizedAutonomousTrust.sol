pragma solidity 0.5.17;

import "./ContinuousOffering.sol";

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
contract DecentralizedAutonomousTrust is ContinuousOffering {
  event Close(uint _exitFee);
  event Pay(address indexed _from, uint _currencyValue);
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

  /// @notice The revenue commitment of the organization. Defines the percentage of the value paid through the contract
  /// that is automatically funneled and held into the buyback_reserve expressed in basis points.
  /// Internal since this is n/a to all derivative contracts.
  function revenueCommitmentBasisPoints() public view returns (uint) {
    return __revenueCommitmentBasisPoints;
  }

  /// Close

  function estimateExitFee(uint _msgValue) public view returns (uint) {
    uint exitFee;

    if (state == STATE_RUN) {
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
      if (exitFee <= reserve) {
        exitFee = 0;
      } else {
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
  function close() public payable {
    uint exitFee = 0;

    if (state == STATE_RUN) {
      exitFee = estimateExitFee(msg.value);
      _collectInvestment(msg.sender, exitFee, msg.value, true);
    }

    super._close();
    emit Close(exitFee);
  }

  /// Pay

  /// @dev Pay the organization on-chain.
  /// @param _currencyValue How much currency which was paid.
  function pay(uint _currencyValue) public payable {
    _collectInvestment(msg.sender, _currencyValue, msg.value, false);
    require(state == STATE_RUN, "INVALID_STATE");
    require(_currencyValue > 0, "MISSING_CURRENCY");

    // Send a portion of the funds to the beneficiary, the rest is added to the buybackReserve
    // Math: if _currencyValue is < (2^256 - 1) / 10000 this will not overflow
    uint reserve = _currencyValue.mul(__revenueCommitmentBasisPoints);
    reserve /= BASIS_POINTS_DEN;

    // Math: this will never underflow since revenueCommitmentBasisPoints is capped to BASIS_POINTS_DEN
    _transferCurrency(beneficiary, _currencyValue - reserve);

    emit Pay(msg.sender, _currencyValue);
  }

  /// @notice Pay the organization on-chain without minting any tokens.
  /// @dev This allows you to add funds directly to the buybackReserve.
  function() external payable {
    require(address(currency) == address(0), "ONLY_FOR_CURRENCY_ETH");
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
  ) public {
    _updateConfig(
      _whitelistAddress,
      _beneficiary,
      _control,
      _feeCollector,
      _feeBasisPoints,
      _minInvestment,
      _minDuration
    );

    require(
      _revenueCommitmentBasisPoints <= BASIS_POINTS_DEN,
      "INVALID_COMMITMENT"
    );
    require(
      _revenueCommitmentBasisPoints >= __revenueCommitmentBasisPoints,
      "COMMITMENT_MAY_NOT_BE_REDUCED"
    );
    __revenueCommitmentBasisPoints = _revenueCommitmentBasisPoints;

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
}
