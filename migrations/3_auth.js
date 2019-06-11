const authorizationArtifact = artifacts.require('Authorization_Pausable');

module.exports = function deployAuth(deployer) {
  // TODO switch to real authorization interface
  deployer.deploy(authorizationArtifact);
};
