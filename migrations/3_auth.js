const authorizationArtifact = artifacts.require('Authorization_AutoApprove');

module.exports = function deployAuth(deployer) {
  // TODO switch to real authorization interface
  deployer.deploy(authorizationArtifact);
};
