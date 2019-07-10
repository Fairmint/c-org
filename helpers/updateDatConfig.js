module.exports = async function updateDatConfig(dat, fair, options, from) {
  const callOptions = Object.assign(
    {
      authorizationAddress: await fair.authorizationAddress(),
      beneficiary: await dat.beneficiary(),
      control: await dat.control(),
      feeCollector: await dat.feeCollector(),
      feeBasisPoints: await dat.feeBasisPoints(),
      burnThresholdBasisPoints: await dat.burnThresholdBasisPoints(),
      minInvestment: await dat.minInvestment(),
      openUntilAtLeast: await dat.openUntilAtLeast(),
      name: await fair.name(),
      symbol: await fair.symbol()
    },
    options
  );

  console.log(`Update DAT: ${JSON.stringify(callOptions, null, 2)}`);

  return dat.updateConfig(
    callOptions.authorizationAddress,
    callOptions.beneficiary,
    callOptions.control,
    callOptions.feeCollector,
    callOptions.feeBasisPoints,
    callOptions.burnThresholdBasisPoints,
    callOptions.minInvestment,
    callOptions.openUntilAtLeast,
    callOptions.name,
    callOptions.symbol,
    { from }
  );
};
