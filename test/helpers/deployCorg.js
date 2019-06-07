const corgArtifact = artifacts.require('c-org');

export default async function deployCorg(options) {
  if (!options.tplInterfaceAddress) throw new Error('Options must include the tplInterfaceAddress');

  const callOptions = Object.assign({
    name: 'Fairmint',
    symbol: 'FSE',
    decimals: 18,
    initReserve: 0,
    currency: '0x0000000000000000000000000000000000000000',
  }, options);

  return corgArtifact.new(
    callOptions.name,
    callOptions.symbol,
    callOptions.decimals,
    callOptions.initReserve,
    callOptions.currency,
    callOptions.tplInterfaceAddress,
  );
}
