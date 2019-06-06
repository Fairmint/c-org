const tplInterface = artifacts.require('TPLInterface-AutoApprove');
const corgArtifact = artifacts.require('c-org');

module.exports = function deployCorg(deployer) {
  deployer.deploy(corgArtifact, tplInterface.address);
};
