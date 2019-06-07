const tplInterfaceArtifact = artifacts.require('TPLInterface-AutoApprove');
const corgArtifact = artifacts.require('c-org');

module.exports = function deployCorg(deployer) {
  const decimals = 18;

  deployer.deploy(
    corgArtifact,
    'c-org', // name TODO confirm
    'crg', // symbol TODO confirm
    decimals,
    42 * (10 ** decimals), // tokens
    tplInterfaceArtifact.address, // TODO switch to real TPL interface
  );
};
