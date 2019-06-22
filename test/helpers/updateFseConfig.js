module.exports = async function updateFseConfig(fse, options, from) {
  const callOptions = Object.assign(
    {
      authorizationAddress: await fse.authorizationAddress(),
      name: await fse.name(),
      symbol: await fse.symbol()
    },
    options
  );

  return fse.updateConfig(
    callOptions.authorizationAddress,
    callOptions.name,
    callOptions.symbol,
    { from }
  );
};
