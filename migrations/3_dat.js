const authorizationArtifact = artifacts.require('Authorization_AutoApprove');
const corgArtifact = artifacts.require('c-org');

module.exports = function deployDat(deployer) {
  deployer.deploy(
    corgArtifact,
    'Fairmint', // name
    'FSE', // symbol
    '42000000000000000000', // tokens
    '0x0000000000000000000000000000000000000000', // currency
    '0', // minGoal
    '0', // minInvestment
    authorizationArtifact.address, // TODO switch to real authorization interface
  );
};
