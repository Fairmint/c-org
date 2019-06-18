const datArtifact = artifacts.require('DecentralizedAutonomousTrust');

module.exports = async function deployDat(options) {
  const callOptions = Object.assign({
    initReserve: '0',
    currency: '0x0000000000000000000000000000000000000000',
    initGoal: '0',
    initDeadline: '0',
    buySlopeNum: '1',
    buySlopeDen: '100000',
    investmentReserveNum: '1',
    investmentReserveDen: '10',
    revenueCommitementNum: '1',
    revenueCommitementDen: '10',
  }, options);

  return datArtifact.new(
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.initDeadline,
    callOptions.buySlopeNum,
    callOptions.buySlopeDen,
    callOptions.investmentReserveNum,
    callOptions.investmentReserveDen,
    callOptions.revenueCommitementNum,
    callOptions.revenueCommitementDen,
  );
};
