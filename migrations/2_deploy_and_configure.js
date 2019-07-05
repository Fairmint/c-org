const erc1820 = require("erc1820");
const { updateDatConfig } = require("../helpers");

// TODO: replace with real TPL artifact
const tplArtifact = artifacts.require("TestTPLAttributeRegistry");
const authArtifact = artifacts.require("Authorization");
const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");

module.exports = async function deployAndConfigure(
  deployer,
  network,
  accounts
) {
  // Deploy 1820 (for local testing only)
  if (network === "development") {
    await erc1820.deploy(web3);
  }

  // Deploy token
  // TODO upgradable?
  const fair = await deployer.deploy(fairArtifact);

  // Deploy Dat
  // TODO upgradable
  const dat = await deployer.deploy(datArtifact);
  await dat.initialize(
    fairArtifact.address,
    "42000000000000000000", // initReserve
    "0x0000000000000000000000000000000000000000", // currencyAddress
    "0", // initGoal
    "1", // buySlopeNum
    "100000", // buySlopeDen
    "1", // investmentReserveNum
    "10", // investmentReserveDen
    "1", // revenueCommitementNum
    "10" // revenueCommitementDen
  );

  // Deploy TPL
  const tpl = await deployer.deploy(tplArtifact);

  // Deploy auth
  // TODO upgradable
  const auth = await deployer.deploy(
    authArtifact,
    fair.address,
    tpl.address,
    [42],
    [0, 0],
    [0, 0, 0]
  );

  // Update dat with auth (and other settings)
  await updateDatConfig(
    dat,
    fair,
    {
      beneficiary: accounts[0],
      authorizationAddress: auth.address,
      name: "Fairmint Fair Synthetic Equity",
      symbol: "FAIR"
    },
    accounts[0]
  );

  // TODO move beneficiary funds to tokenVesting contract(s)
};
