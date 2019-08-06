module.exports = async function updateDatConfig(contracts, options) {
  const callOptions = Object.assign(
    {
      erc1404Address: await contracts.fair.erc1404Address(),
      beneficiary: await contracts.dat.beneficiary(),
      control: await contracts.dat.control(),
      feeCollector: await contracts.dat.feeCollector(),
      feeBasisPoints: await contracts.dat.feeBasisPoints(),
      burnThresholdBasisPoints: await contracts.dat.burnThresholdBasisPoints(),
      minInvestment: await contracts.dat.minInvestment(),
      openUntilAtLeast: await contracts.dat.openUntilAtLeast(),
      name: await contracts.fair.name(),
      symbol: await contracts.fair.symbol()
    },
    options
  );

  //console.log(`Update DAT: ${JSON.stringify(callOptions, null, 2)}`);

  return contracts.dat.updateConfig(
    callOptions.erc1404Address,
    callOptions.beneficiary,
    callOptions.control,
    callOptions.feeCollector,
    callOptions.feeBasisPoints,
    callOptions.burnThresholdBasisPoints,
    callOptions.minInvestment,
    callOptions.openUntilAtLeast,
    callOptions.name,
    callOptions.symbol,
    { from: await contracts.dat.control() }
  );
};
