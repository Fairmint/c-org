const tplInterfaceArtifact = artifacts.require('TPLInterface-AutoApprove');
const corgArtifact = artifacts.require('c-org');

module.exports = function deployCorg(deployer) {
  // TODO switch to real TPL interface
  // TODO check name, symbol and decimals used
  deployer.deploy(corgArtifact, 'c-org', 'crg', 18, tplInterfaceArtifact.address);
};
