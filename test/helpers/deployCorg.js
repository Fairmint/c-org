const corgArtifact = artifacts.require('c-org');

module.exports = async function deployCorg(options) {
  if (!options.tplInterfaceAddress) throw new Error('Options must include the tplInterfaceAddress');

  const callOptions = Object.assign({
    name: 'Fairmint',
    symbol: 'FSE',
    decimals: 18,
    initReserve: '0',
    currency: '0x0000000000000000000000000000000000000000',
    initGoal: '0',
    minInvestment: '0',
  }, options);

  return corgArtifact.new(
    callOptions.name,
    callOptions.symbol,
    callOptions.decimals,
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.minInvestment,
    callOptions.tplInterfaceAddress,
  );
};
