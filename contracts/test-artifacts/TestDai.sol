pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


contract TestDai is
  ERC20,
  ERC20Detailed
{
  constructor() public
    ERC20Detailed("Test DAI token", "DAI", 18)
  {}

  function mint(address account, uint256 amount) public returns (bool) {
    _mint(account, amount);
    return true;
  }
}
