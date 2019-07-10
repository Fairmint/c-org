const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigDivArtifact = artifacts.require("BigDiv");

module.exports = async function deployDat(options, from) {
  const callOptions = Object.assign(
    {
      initReserve: "42000000000000000000",
      currency: "0x0000000000000000000000000000000000000000",
      initGoal: "0",
      buySlopeNum: "1",
      buySlopeDen: "100000",
      investmentReserveBasisPoints: "1000",
      revenueCommitementBasisPoints: "1000"
    },
    options
  );

  console.log(`Deploy DAT: ${JSON.stringify(callOptions, null, 2)}`);

  const fair = await fairArtifact.new();
  const library = await bigDivArtifact.new();
  const dat = await datArtifact.new();
  await dat.initialize(
    library.address,
    fair.address,
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.buySlopeNum,
    callOptions.buySlopeDen,
    callOptions.investmentReserveBasisPoints,
    callOptions.revenueCommitementBasisPoints,
    { from }
  );
  return [dat, fair];
};
