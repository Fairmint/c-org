module.exports = async function updateDatConfig(contracts, options) {
  const callOptions = Object.assign(
    {
      whitelistAddress: await contracts.dat.whitelist(),
      beneficiary: await contracts.dat.beneficiary(),
      control: await contracts.dat.control(),
      feeCollector: await contracts.dat.feeCollector(),
      overridePayTo: await contracts.dat.overridePayTo(),
      feeBasisPoints: await contracts.dat.feeBasisPoints(),
      autoBurn: await contracts.dat.autoBurn(),
      revenueCommitmentBasisPoints: await contracts.dat.revenueCommitmentBasisPoints(),
      minInvestment: await contracts.dat.minInvestment(),
      openUntilAtLeast: await contracts.dat.openUntilAtLeast(),
    },
    options
  );

  //console.log(`Update DAT: ${JSON.stringify(callOptions, null, 2)}`);
  const result = await contracts.dat.updateConfig(
    callOptions.whitelistAddress,
    callOptions.beneficiary,
    callOptions.control,
    callOptions.feeCollector,
    callOptions.overridePayTo,
    callOptions.feeBasisPoints,
    callOptions.autoBurn,
    callOptions.revenueCommitmentBasisPoints,
    callOptions.minInvestment,
    callOptions.openUntilAtLeast,
    { from: await contracts.dat.control() }
  );
  return result;
};
