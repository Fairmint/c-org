# @title Reduces the size of terms before multiplication, to avoid an overflow, and then
# restores the proper size after division.  
# @notice This effectively allows us to overflow values in the numerator and/or denominator 
# of a fraction, so long as the end result does not overflow as well.
# @dev Each individual numerator or denominator term is reduced if large so that multiplication 
# is safe from overflow.  Then we perform the division using the reduced terms.  Finally the
# result is increased to restore the original scale of terms.

MAX_UINT: constant(uint256) = 2**256 - 1

MAX_BEFORE_SQUARE: constant(uint256) = 340282366920938463463374607431768211456
# @notice When multiplying 2 terms, the max value is sqrt(2^256-1) 

DIGITS_UINT: constant(uint256) = 10 ** 18
# @notice Represents 1 full token (with 18 decimals)

DIGITS_DECIMAL: constant(decimal) = convert(DIGITS_UINT, decimal)
# @notice Represents 1 full token (with 18 decimals)

@public
@constant
def bigDiv2x1(
  _numA: uint256,
  _numB: uint256,
  _den: uint256,
  _roundUp: bool
) -> uint256:
  if(_numA == 0 or _numB == 0):
    return 0
  if(MAX_UINT / _numA > _numB):
    if(_roundUp):
      return (_numA * _numB - 1) / _den + 1
    else:
      return _numA * _numB / _den

  # Find max value
  value: uint256 = _numA
  if(_numB > value):
    value = _numB
  if(_den > value):
    value = _den
  
  # Use max to determine factor to use
  factor: uint256 = value / MAX_BEFORE_SQUARE 
  if(factor == 0):
    factor = 1
  
  count: int128 = 0
  
  if(_numA >= MAX_BEFORE_SQUARE):
    if(_roundUp):
      value = (_numA - 1) / factor + 1
    else:
      value = _numA / factor
    count += 1
  else:
    value = _numA
  if(_numB >= MAX_BEFORE_SQUARE):
    if(_roundUp):
      value *= (_numB - 1) / factor + 1
    else:
      value *= _numB / factor
    count += 1
  else:
    value *= _numB

  den: uint256
  if(_den >= MAX_BEFORE_SQUARE):
    if(_roundUp):
      den = _den / factor
    else:
      den = (_den - 1) / factor + 1
    count -= 1
  else:
    den = _den
  
  if(_roundUp):
    value = (value - 1) / den + 1
  else:
    value /= den

  if(count >= 1):
    value *= factor ** convert(count, uint256)
  elif(count <= -1):
    count *= -1
    value /= factor ** convert(count, uint256)

  return value

@public
@constant
def bigDiv2x2(
  _numA: uint256,
  _numB: uint256,
  _denA: uint256,
  _denB: uint256
) -> uint256:
  """
  @dev rounds down
  """
  if(_numA == 0 or _numB == 0):
    return 0
  if(MAX_UINT / _numA > _numB and MAX_UINT / _denA > _denB):
    return _numA * _numB / (_denA * _denB)

  # Find max value
  value: uint256 = _numA
  if(_numB > value):
    value = _numB
  if(_denA > value):
    value = _denA
  if(_denB > value):
    value = _denB
  
  # Use max to determine factor to use
  factor: uint256 = value / MAX_BEFORE_SQUARE 
  if(factor == 0):
    factor = 1
  
  count: int128 = 0
  
  if(_numA >= MAX_BEFORE_SQUARE):
    value = _numA / factor
    count += 1
  else:
    value = _numA
  if(_numB >= MAX_BEFORE_SQUARE):
    value *= _numB / factor
    count += 1
  else:
    value *= _numB

  den: uint256
  if(_denA >= MAX_BEFORE_SQUARE):
    den = (_denA - 1) / factor + 1
    count -= 1
  else:
    den = _denA
  if(_denB >= MAX_BEFORE_SQUARE):
    den *= (_denB - 1) / factor + 1
    count -= 1
  else:
    den *= _denB
  
  value /= den

  if(count >= 1):
    value *= factor ** convert(count, uint256)
  elif(count <= -1):
    count *= -1
    value /= factor ** convert(count, uint256)

  return value

@public
@constant
def sqrtOfTokensSupplySquared(
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
