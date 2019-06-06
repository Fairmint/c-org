# Test contract
# Implements the TPL interfaces and authorizes everything for everyone.

@public
@constant
def canTransfer(_to: address, _value: uint256) -> bool:
  return True

@public
@constant
def canTransferFrom(_from: address, _to: address, _value: uint256) -> bool:
  return True
