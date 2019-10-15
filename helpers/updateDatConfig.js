module.exports = async function updateDatConfig(contracts, options) {
  const callOptions = Object.assign(
    {
      bigMathAddress: await contracts.dat.bigMathAddress(),
      whitelistAddress: await contracts.dat.whitelistAddress(),
      beneficiary: await contracts.dat.beneficiary(),
      control: await contracts.dat.control(),
      feeCollector: await contracts.dat.feeCollector(),
      feeBasisPoints: await contracts.dat.feeBasisPoints(),
      autoBurn: await contracts.dat.autoBurn(),
      revenueCommitmentBasisPoints: await contracts.dat.revenueCommitmentBasisPoints(),
      minInvestment: await contracts.dat.minInvestment(),
      openUntilAtLeast: await contracts.dat.openUntilAtLeast(),
      name: await contracts.dat.name(),
      symbol: await contracts.dat.symbol()
    },
    options
  );

  //console.log(`Update DAT: ${JSON.stringify(callOptions, null, 2)}`);
  const result = await contracts.dat.updateConfig(
    callOptions.bigMathAddress,
    callOptions.whitelistAddress,
    callOptions.beneficiary,
    callOptions.control,
    callOptions.feeCollector,
    callOptions.feeBasisPoints,
    callOptions.autoBurn,
    callOptions.revenueCommitmentBasisPoints,
    callOptions.minInvestment,
    callOptions.openUntilAtLeast,
    callOptions.name,
    callOptions.symbol,
    { from: await contracts.dat.control() }
  );
  return result;
};
