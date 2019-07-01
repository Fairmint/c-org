module.exports = async function updateFairConfig(fair, options, from) {
  const callOptions = Object.assign(
    {
      authorizationAddress: await fair.authorizationAddress(),
      name: await fair.name(),
      symbol: await fair.symbol()
    },
    options
  );

  return fair.updateConfig(
    callOptions.authorizationAddress,
    callOptions.name,
    callOptions.symbol,
    { from }
  );
};
