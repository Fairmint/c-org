const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigDivArtifact = artifacts.require("BigDiv");
const tplArtifact = artifacts.require("TestTPLAttributeRegistry");
const authArtifact = artifacts.require("TestAuthorization");
const { updateDatConfig } = require("../../helpers");

module.exports = async function deployDat(options, from) {
  const callOptions = Object.assign(
    {
      initReserve: "42000000000000000000",
      currency: "0x0000000000000000000000000000000000000000",
      initGoal: "0",
      buySlopeNum: "1",
      buySlopeDen: "100000000000000000000",
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
  const tpl = await tplArtifact.new();
  const auth = await authArtifact.new();
  await auth.initialize(fair.address);
  await auth.updateAuth(tpl.address, [42], [0, 0], [0, 0, 0]);
  await updateDatConfig(
    dat,
    fair,
    {
      authorizationAddress: auth.address
    },
    from
  );
  return [dat, fair, auth];
};
