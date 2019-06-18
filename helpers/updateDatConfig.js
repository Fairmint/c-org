module.exports = async function updateDatConfig(dat, options, txOptions) {
  const callOptions = Object.assign({
    authorizationAddress: await dat.authorizationAddress(),
    beneficiary: await dat.beneficiary(),
    control: await dat.control(),
    feeCollector: await dat.feeCollector(),
    feeNum: await dat.feeNum(),
    feeDem: await dat.feeDem(),
    minInvestment: await dat.minInvestment(),
    name: await dat.name(),
    symbol: await dat.symbol(),
  }, options);

  return dat.updateConfig(
    callOptions.authorizationAddress,
    callOptions.beneficiary,
    callOptions.control,
    callOptions.feeCollector,
    callOptions.feeNum,
    callOptions.feeDem,
    callOptions.minInvestment,
    callOptions.name,
    callOptions.symbol,
    txOptions,
  );
};
