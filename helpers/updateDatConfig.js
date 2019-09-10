module.exports = async function updateDatConfig(contracts, options) {
  const callOptions = Object.assign(
    {
      bigDivAddress: await contracts.dat.bigDivAddress(),
      erc1404Address: await contracts.dat.erc1404Address(),
      beneficiary: await contracts.dat.beneficiary(),
      control: await contracts.dat.control(),
      feeCollector: await contracts.dat.feeCollector(),
      feeBasisPoints: await contracts.dat.feeBasisPoints(),
      burnThresholdBasisPoints: await contracts.dat.burnThresholdBasisPoints(),
      minInvestment: await contracts.dat.minInvestment(),
      openUntilAtLeast: await contracts.dat.openUntilAtLeast(),
      name: await contracts.dat.name(),
      symbol: await contracts.dat.symbol()
    },
    options
  );

  //console.log(`Update DAT: ${JSON.stringify(callOptions, null, 2)}`);

  return contracts.dat.updateConfig(
    callOptions.bigDivAddress,
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
