# @title Reduces the size of terms before multiplication, to avoid an overflow, and then
# restores the proper size after division.  This effectively allows us to overflow values in the 
# numerator and/or denominator of a fraction, so long as the end result does not overflow as well.

MAX_BEFORE_SQUARE: constant(uint256)  = 340282366920938425684442744474606501888
# @notice When multiplying 2 terms, the max value is sqrt(2^256-1) 
MAX_BEFORE_CUBE: constant(uint256)    = 48740834812604114263867392
# @notice When multiplying 3 terms, the max value is (2^256-1)^(1/3)
MAX_BEFORE_POW4: constant(uint256)    = 18446744073709551616
# @notice When multiplying 4 terms, the max value is (2^256-1)^(1/4)

@public
@constant
def bigDiv3x3(
  _numA: uint256,
  _numB: uint256,
  _numC: uint256,
  _denA: uint256,
  _denB: uint256,
  _denC: uint256,
  _roundUp: bool
) -> uint256:
  # Find max value
  value: uint256 = _numA
  if(_numB > value):
    value = _numB
  if(_numC > value):
    value = _numC
  if(_denA > value):
    value = _denA
  if(_denB > value):
    value = _denB
  if(_denC > value):
    value = _denC
  
  # Use max to determine factor to use
  factor: uint256 = value / MAX_BEFORE_CUBE 
  if(factor == 0):
    factor = 1
  
  count: int128 = 0
  
  if(_numA >= MAX_BEFORE_CUBE):
    if(_roundUp):
      value = (_numA - 1) / factor + 1
    else:
      value = _numA / factor
    count += 1
  else:
    value = _numA
  if(_numB >= MAX_BEFORE_CUBE):
    if(_roundUp):
      value *= (_numB - 1) / factor + 1
    else:
      value *= _numB / factor
    count += 1
  else:
    value *= _numB
  if(_numC >= MAX_BEFORE_CUBE):
    if(_roundUp):
      value *= (_numC - 1) / factor + 1
    else:
      value *= _numC / factor
    count += 1
  else:
    value *= _numC

  if(value == 0):
    return 0

  den: uint256
  if(_denA >= MAX_BEFORE_CUBE):
    if(_roundUp):
      den = _denA / factor
    else:
      den = (_denA - 1) / factor + 1
    count -= 1
  else:
    den = _denA
  if(_denB >= MAX_BEFORE_CUBE):
    if(_roundUp):
      den *= _denB / factor
    else:
      den *= (_denB - 1) / factor + 1
    count -= 1
  else:
    den *= _denB
  if(_denC >= MAX_BEFORE_CUBE):
    if(_roundUp):
      den *= _denC / factor
    else:
      den *= (_denC - 1) / factor + 1
    count -= 1
  else:
    den *= _denC
  
  value /= den

  if(count >= 1):
    value *= factor ** convert(count, uint256)
  elif(count <= -1):
    value /= factor ** convert(count * -1, uint256)

  return value
