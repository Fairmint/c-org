pragma solidity ^0.5.0;

import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";


contract UpgradeableProxy is
  AdminUpgradeabilityProxy
{
  constructor(address _logic, address _admin, bytes memory _data) 
    public
    AdminUpgradeabilityProxy(_logic, _admin, _data)
  {}
}
