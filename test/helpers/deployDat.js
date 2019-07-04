const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");

module.exports = async function deployDat(options, from) {
  const callOptions = Object.assign(
    {
      beneficiary: from,
      initReserve: "42000000000000000000",
      currency: "0x0000000000000000000000000000000000000000",
      initGoal: "0",
      buySlopeNum: "1",
      buySlopeDen: "100000",
      investmentReserveNum: "1",
      investmentReserveDen: "10",
      revenueCommitementNum: "1",
      revenueCommitementDen: "10"
    },
    options
  );

  console.log(`Deploy DAT: ${JSON.stringify(callOptions, null, 2)}`);

  const fair = await fairArtifact.new();
  const dat = await datArtifact.new();
  await dat.initialize(
    callOptions.beneficiary,
    fair.address,
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.buySlopeNum,
    callOptions.buySlopeDen,
    callOptions.investmentReserveNum,
    callOptions.investmentReserveDen,
    callOptions.revenueCommitementNum,
    callOptions.revenueCommitementDen,
    { from }
  );
  return [dat, fair];
};
