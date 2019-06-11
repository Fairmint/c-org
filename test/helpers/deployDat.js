const datArtifact = artifacts.require('DecentralizedAutonomousTrust');

module.exports = async function deployDat(options) {
  if (!options.authorizationAddress) throw new Error('Options must include the Authorization contract address');

  const callOptions = Object.assign({
    name: 'Fairmint',
    symbol: 'FSE',
    initReserve: '0',
    currency: '0x0000000000000000000000000000000000000000',
    initGoal: '0',
    minInvestment: '1',
    initDeadline: '0',
    buySlopeNum: '1',
    buySlopeDen: '100000',
    investmentReserveNum: '1',
    investmentReserveDen: '10',
    revenueCommitementNum: '1',
    revenueCommitementDen: '10',
  }, options);

  return datArtifact.new(
    callOptions.name,
    callOptions.symbol,
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.minInvestment,
    callOptions.initDeadline,
    callOptions.buySlopeNum,
    callOptions.buySlopeDen,
    callOptions.investmentReserveNum,
    callOptions.investmentReserveDen,
    callOptions.revenueCommitementNum,
    callOptions.revenueCommitementDen,
    callOptions.authorizationAddress,
  );
};
