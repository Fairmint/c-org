const datArtifact = artifacts.require('DecentralizedAutonomousTrust');

module.exports = function deployDat(deployer) {
  deployer.deploy(
    datArtifact,
    'Fairmint', // name
    'FSE', // symbol
    '42000000000000000000', // initReserve
    '0x0000000000000000000000000000000000000000', // currencyAddress
    '0', // initGoal
    '0', // initDeadline
    '1', // buySlopeNum
    '100000', // buySlopeDen
    '1', // investmentReserveNum
    '10', // investmentReserveDen
    '1', // revenueCommitementNum
    '10', // revenueCommitementDen
  );
};
