const erc1820 = require("erc1820");
const { updateDatConfig } = require("../helpers");

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
  const fair = await deployer.deploy(fairArtifact);

  // Deploy Dat
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
};
