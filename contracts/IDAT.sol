pragma solidity ^0.5.0;

interface IDAT
{
  function beneficiary() external view returns (address);
  function state() external view returns (uint256);
}