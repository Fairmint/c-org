pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/drafts/TokenVesting.sol";
import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";
import "zos-lib/contracts/upgradeability/ProxyAdmin.sol";
import "./math/BigDiv.sol";
import "./math/Sqrt.sol";

/**
 * This creates the artifacts allowing us to use these 3rd party contracts directly
 */
contract Dependencies is TokenVesting, AdminUpgradeabilityProxy, ProxyAdmin, BigDiv, Sqrt
{
  constructor() internal
    TokenVesting()
    AdminUpgradeabilityProxy(address(0), address(0), "")
    BigDiv()
    Sqrt()
  {}
}
