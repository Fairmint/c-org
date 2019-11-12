pragma solidity ^0.5.0;

import "@openzeppelin/contracts/drafts/TokenVesting.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "zos-lib/contracts/upgradeability/ProxyAdmin.sol";
import "hardlydifficult-ethereum-contracts/contracts/math/BigDiv.sol";
import "hardlydifficult-ethereum-contracts/contracts/math/Sqrt.sol";

/**
 * This creates the artifacts allowing us to use these 3rd party contracts directly
 */
contract Dependencies is TokenVesting, AdminUpgradeabilityProxy, ProxyAdmin, BigDiv, Sqrt
{
  constructor() internal
    TokenVesting(address(0), 0, 0, 0, false)
    AdminUpgradeabilityProxy(address(0), address(0), '')
    BigDiv()
    Sqrt()
  {}
}
