const tplInterfaceArtifact = artifacts.require('TPLERC20Interface_AutoApprove');
const corgArtifact = artifacts.require('c-org');

module.exports = function deployCorg(deployer) {
  const decimals = 18;

  deployer.deploy(
    corgArtifact,
    'Fairmint', // name
    'FSE', // symbol
    decimals,
    '42000000000000000000', // tokens
    '0x0000000000000000000000000000000000000000', // currency
    '0', // minGoal
    '0', // minInvestment
    tplInterfaceArtifact.address, // TODO switch to real TPL interface
  );
};
