const { constants } = require("hardlydifficult-eth");

module.exports = async function updateDatConfig(contracts, options) {
  /* Original version:
    address _whitelistAddress,
    address payable _beneficiary,
    address _control,
    address payable _feeCollector,
    uint _feeBasisPoints,
    bool _autoBurn,
    uint _revenueCommitmentBasisPoints,
    uint _minInvestment,
    uint _minDuration
  */
  const callOptions = Object.assign(
    {
      whitelistAddress: await contracts.dat.whitelist(),
      beneficiary: await contracts.dat.beneficiary(),
      control: await contracts.dat.control(),
      feeCollector: await contracts.dat.feeCollector(),
      overridePayTo: contracts.dat.overridePayTo
        ? await contracts.dat.overridePayTo()
        : constants.ZERO_ADDRESS,
      feeBasisPoints: await contracts.dat.feeBasisPoints(),
      autoBurn: await contracts.dat.autoBurn(),
      revenueCommitmentBasisPoints: await contracts.dat.revenueCommitmentBasisPoints(),
      minInvestment: await contracts.dat.minInvestment(),
      minDuration: await contracts.dat.minDuration(),
    },
    options
  );

  let result;
  //console.log(`Update DAT: ${JSON.stringify(callOptions, null, 2)}`);
  if (contracts.dat.overridePayTo) {
    // latest version
    result = await contracts.dat.updateConfig(
      callOptions.whitelistAddress,
      callOptions.beneficiary,
      callOptions.control,
      callOptions.feeCollector,
      callOptions.overridePayTo,
      callOptions.feeBasisPoints,
      callOptions.autoBurn,
      callOptions.revenueCommitmentBasisPoints,
      callOptions.minInvestment,
      callOptions.minDuration,
      { from: await contracts.dat.control() }
    );
  } else {
    // original version
    result = await contracts.dat.updateConfig(
      callOptions.whitelistAddress,
      callOptions.beneficiary,
      callOptions.control,
      callOptions.feeCollector,
      callOptions.feeBasisPoints,
      callOptions.autoBurn,
      callOptions.revenueCommitmentBasisPoints,
      callOptions.minInvestment,
      callOptions.openUntilAtLeast || 0,
      { from: await contracts.dat.control() }
    );
  }

  return result;
};
