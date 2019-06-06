const tplInterface = artifacts.require('TPLInterface-AutoApprove');

module.exports = function deployCorg(deployer) {
  // TODO switch to real TPL interface
  deployer.deploy(tplInterface);
};
