const authorizationArtifact = artifacts.require('Authorization_Pausable');
const datArtifact = artifacts.require('DecentralizedAutonomousTrust');

module.exports = function deployDat(deployer) {
  deployer.deploy(
    datArtifact,
    'Fairmint', // name
    'FSE', // symbol
    '42000000000000000000', // initReserve
    '0x0000000000000000000000000000000000000000', // currency
    '0', // initGoal
    '0', // minInvestment
    authorizationArtifact.address, // TODO switch to real authorization interface
  );
};
