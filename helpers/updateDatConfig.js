module.exports = async function updateDatConfig(dat, options, txOptions) {
  const callOptions = Object.assign({
    authorizationAddress: await dat.authorizationAddress(),
    beneficiary: await dat.beneficiary(),
    control: await dat.control(),
    feeCollector: await dat.feeCollector(),
    feeNum: await dat.feeNum(),
    feeDen: await dat.feeDen(),
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
    callOptions.feeDen,
    callOptions.minInvestment,
    callOptions.name,
    callOptions.symbol,
    txOptions,
  );
};
