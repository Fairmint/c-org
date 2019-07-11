const erc1820 = require("erc1820");
const { updateDatConfig } = require("../helpers");

// TODO: replace with real TPL artifact
const tplArtifact = artifacts.require("TestTPLAttributeRegistry");
const authArtifact = artifacts.require("Authorization");
const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigDivArtifact = artifacts.require("BigDiv");
const vestingArtifact = artifacts.require("Vesting");

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

  // Deploy Library
  const bigDiv = await deployer.deploy(bigDivArtifact);

  // Deploy Dat
  // TODO upgradable
  const dat = await deployer.deploy(datArtifact);
  await dat.initialize(
    bigDiv.address,
    fairArtifact.address,
    "42000000000000000000", // initReserve
    "0x0000000000000000000000000000000000000000", // currencyAddress
    "0", // initGoal
    "1", // buySlopeNum
    "100000", // buySlopeDen
    "1000", // investmentReserveBasisPoints
    "1000" // revenueCommitementBasisPoints
  );

  // Deploy TPL
  const tpl = await deployer.deploy(tplArtifact);

  // Deploy auth
  // TODO upgradable
  const auth = await deployer.deploy(authArtifact);
  await auth.initialize(fair.address);
  await auth.updateAuth(tpl.address, [42], [0, 0], [0, 0, 0]);

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

  // Move the initReserve to vesting contracts
  const vestingBeneficiary = await deployer.deploy(
    vestingArtifact,
    accounts[0], // beneficiary
    Math.round(Date.now() / 1000) + 100, // startTime is seconds
    120, // cliffDuration in seconds
    200, // duration in seconds
    false // non-revocable
  );
  const vestingAccount1 = await deployer.deploy(
    vestingArtifact,
    accounts[1], // beneficiary
    Math.round(Date.now() / 1000) + 100, // startTime is seconds
    120, // cliffDuration in seconds
    200, // duration in seconds
    false // non-revocable
  );
  await fair.transfer(vestingBeneficiary.address, "40000000000000000000");
  await fair.transfer(vestingAccount1.address, "2000000000000000000");
};
