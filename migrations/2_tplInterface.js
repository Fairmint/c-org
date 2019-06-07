const tplInterfaceArtifact = artifacts.require('TPLInterface-AutoApprove');

module.exports = function deployTplInterface(deployer) {
  // TODO switch to real TPL interface
  deployer.deploy(tplInterfaceArtifact);
};
