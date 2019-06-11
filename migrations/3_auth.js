const authorizationArtifact = artifacts.require('Authorization');

module.exports = function deployAuth(deployer) {
  deployer.deploy(authorizationArtifact, 0);
};
