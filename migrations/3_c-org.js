const tplInterfaceArtifact = artifacts.require('TPLInterface-AutoApprove');
const corgArtifact = artifacts.require('c-org');

module.exports = function deployCorg(deployer) {
  const decimals = 18;

  deployer.deploy(
    corgArtifact,
    'Fairmint', // name
    'FSE', // symbol
    decimals,
    42 * (10 ** decimals), // tokens
    tplInterfaceArtifact.address, // TODO switch to real TPL interface
  );
};
