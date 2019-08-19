# @title ERC-1404 implementation which manages KYC approvals for the org.

Approve: event({
  _trader: indexed(address),
  _isApproved: bool
})

approved: public(map(address, bool))
owner: public(address)

@public
def initialize():
  assert self.owner == ZERO_ADDRESS, "ALREADY_INITIALIZED"

  self.owner = msg.sender
  self.approved[ZERO_ADDRESS] = True

@public
def detectTransferRestriction(
  _from: address,
  _to: address,
  _value: uint256
) -> uint256:
  if(self.approved[_from] and self.approved[_to]):
    return 0

  return 1 # Denied

@public
@constant
def messageForTransferRestriction(
  _restrictionCode: uint256
) -> string[1024]:
  if(_restrictionCode == 0):
    return "SUCCESS"
  if(_restrictionCode == 1):
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
