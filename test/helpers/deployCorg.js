const corgArtifact = artifacts.require('c-org');

module.exports = async function deployCorg(options) {
  if (!options.authorizationAddress) throw new Error('Options must include the Authorization contract address');

  const callOptions = Object.assign({
    name: 'Fairmint',
    symbol: 'FSE',
    initReserve: '0',
    currency: '0x0000000000000000000000000000000000000000',
    initGoal: '0',
    minInvestment: '0',
  }, options);

  return corgArtifact.new(
    callOptions.name,
    callOptions.symbol,
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.minInvestment,
    callOptions.authorizationAddress,
  );
};
