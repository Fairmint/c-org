pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";


interface IDAT is IERC20, IERC777
{
  function state() external view returns (uint256);
}