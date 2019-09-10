# @title Reduces the size of terms before multiplication, to avoid an overflow, and then
# restores the proper size after division.  
# @notice This effectively allows us to overflow values in the numerator and/or denominator 
# of a fraction, so long as the end result does not overflow as well.
# @dev Each individual numerator or denominator term is reduced if large so that multiplication 
# is safe from overflow.  Then we perform the division using the reduced terms.  Finally the
# result is increased to restore the original scale of terms.

MAX_BEFORE_SQUARE: constant(uint256)  = 340282366920938425684442744474606501888
# @notice When multiplying 2 terms, the max value is sqrt(2^256-1)

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
