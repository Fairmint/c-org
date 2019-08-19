# @title ERC-1404 implementation which manages KYC approvals for the org.

# Events
Approve: event({
  _trader: indexed(address),
  _isApproved: bool
})

approved: public(map(address, bool))
owner: public(address)

@public
def __init__():
  self.owner = msg.sender

@public
def detectTransferRestriction(
  _from: address,
  _to: address,
  _value: uint256
) -> uint256:
  if(self.approved[_from] and self.approved[_to]):
    return 0
  if(self.approved[_from] and _to == ZERO_ADDRESS):
    return 0
  if(self.approved[_to] and _from == ZERO_ADDRESS):
    return 0

  return 1 # Denied

@public
@constant
def messageForTransferRestriction(
  _restrictionCode: uint256
) -> string[1024]:
  if(_restrictionCode == 0):
    return "SUCCESS"
  elif(_restrictionCode == 1):
    return "DENIED"
  return "UNKNOWN_ERROR"

@public
def approve(
  _trader: address,
  _isApproved: bool
):
  assert msg.sender == self.owner, "OWNER_ONLY"
  self.approved[_trader] = _isApproved
  log.Approve(_trader, _isApproved)
