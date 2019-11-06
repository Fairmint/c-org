# @title Reduces the size of terms before multiplication, to avoid an overflow, and then
# restores the proper size after division.  
# @notice This effectively allows us to overflow values in the numerator and/or denominator 
# of a fraction, so long as the end result does not overflow as well.

MAX_UINT: constant(uint256) = 2**256 - 1
# @notice The max possible value

DIGITS_UINT: constant(uint256) = 10 ** 18
# @notice Represents 1 full token (with 18 decimals)

DIGITS_DECIMAL: constant(decimal) = convert(DIGITS_UINT, decimal)
# @notice Represents 1 full token (with 18 decimals)

@public
@constant
def sqrtOfTokensSupplySquared(
  _tokenValue: uint256,
  _supply: uint256
) -> uint256:
  """
  @notice Calculates sqrt((_tokenValue + _supply^2)/10^18)*10^18
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
