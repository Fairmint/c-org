const corgArtifact = artifacts.require('c-org');

module.exports = function deployCorg(deployer) {
  deployer.deploy(corgArtifact);
};
