const tplInterfaceArtifact = artifacts.require('TPLERC20Interface_AutoApprove');

module.exports = function deployTplInterface(deployer) {
  // TODO switch to real TPL interface
  deployer.deploy(tplInterfaceArtifact);
};
