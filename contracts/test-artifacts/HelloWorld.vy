# Test contract
# A trivial contract used to confirm the env configuration

data: public(uint256)

@public
def __init__():
  self.data = 42

@public
def setData(_data : uint256):
  self.data = _data

@public
@constant
def dataPlus(_value : uint256) -> uint256:
    return self.data + _value
