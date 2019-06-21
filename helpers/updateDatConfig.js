const fseArtifact = artifacts.require("FairSyntheticEquity");

module.exports = async function updateDatConfig(dat, options, from) {
  const fse = await fseArtifact.at(await dat.fseAddress());
  const callOptions = Object.assign(
    {
      authorizationAddress: await fse.authorizationAddress(),
      beneficiary: await dat.beneficiary(),
      control: await dat.control(),
      feeCollector: await dat.feeCollector(),
      feeNum: await dat.feeNum(),
      feeDen: await dat.feeDen(),
      burnThresholdNum: await dat.burnThresholdNum(),
      burnThresholdDen: await dat.burnThresholdDen(),
      minInvestment: await dat.minInvestment(),
      name: await fse.name(),
      symbol: await fse.symbol()
    },
    options
  );

  return dat.updateConfig(
    callOptions.authorizationAddress,
    callOptions.beneficiary,
    callOptions.control,
    callOptions.feeCollector,
    callOptions.feeNum,
    callOptions.feeDen,
    callOptions.burnThresholdNum,
    callOptions.burnThresholdDen,
    callOptions.minInvestment,
    callOptions.name,
    callOptions.symbol,
    { from }
  );
};
