const erc1820 = require("erc1820");
const { updateDatConfig } = require("../helpers");
const fs = require("fs");

// TODO: replace with real TPL artifact
const tplArtifact = artifacts.require("TestTPLAttributeRegistry");
// TODO: replace with real DAI
const testDaiArtifact = artifacts.require("TestDai");
const authArtifact = artifacts.require("Authorization");
const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigDivArtifact = artifacts.require("BigDiv");
const vestingArtifact = artifacts.require("Vesting");
const proxyArtifact = artifacts.require("UpgradeableProxy");
const proxyAdminArtifact = artifacts.require("UpgradeableProxyAdmin");

module.exports = async function deployAndConfigure(
  deployer,
  network,
  accounts
) {
  const json = {};
  const control = accounts[0];

  // Deploy 1820 (for local testing only)
  if (network === "development") {
    await erc1820.deploy(web3);
  }

  // Deploy proxy admin
  const proxyAdmin = await proxyAdminArtifact.new();
  json.proxyAdmin = {
    address: proxyAdmin.address,
    abi: proxyAdmin.abi
  };

  // Deploy token
  const fairContract = await deployer.deploy(fairArtifact);
  const fairProxy = await proxyArtifact.new(
    fairContract.address, // logic
    proxyAdmin.address, // admin
    [] // data
  );
  const fair = await fairArtifact.at(fairProxy.address);
  json.fair = {
    address: fair.address,
    implementation: fairContract.address,
    abi: fair.abi
  };

  // Deploy Library
  const bigDiv = await deployer.deploy(bigDivArtifact);
  json.bigDiv = {
    address: bigDiv.address,
    abi: bigDiv.abi
  };

  // Deploy testDAI
  const dai = await deployer.deploy(testDaiArtifact);
  json.dai = {
    address: dai.address,
    abi: dai.abi
  };

  // Deploy Dat
  const datContract = await deployer.deploy(datArtifact);
  const datProxy = await proxyArtifact.new(
    datContract.address, // logic
    proxyAdmin.address, // admin
    [] // data
  );
  const dat = await datArtifact.at(datProxy.address);
  await dat.initialize(
    bigDiv.address,
    fair.address,
    "42000000000000000000", // initReserve
    dai.address, // currencyAddress
    "0", // initGoal
    "1", // buySlopeNum
    "100000000000000000000", // buySlopeDen
    "1000", // investmentReserveBasisPoints
    "1000" // revenueCommitementBasisPoints
  );
  json.dat = {
    address: dat.address,
    implementation: datContract.address
  };

  // Deploy TPL
  const tpl = await deployer.deploy(tplArtifact);
  json.tpl = {
    address: tpl.address,
    abi: tpl.abi
  };

  // Deploy auth
  const authContract = await deployer.deploy(authArtifact);
  const authProxy = await proxyArtifact.new(
    authContract.address, // logic
    proxyAdmin.address, // admin
    [] // data
  );
  const auth = await authArtifact.at(authProxy.address);
  await auth.initialize(fair.address);
  await auth.updateAuth(tpl.address, [42], [0, 0], [0, 0, 0]);
  json.auth = {
    address: auth.address,
    implementation: authContract.address,
    abi: auth.abi
  };

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
  // const vestingAccount1 = await deployer.deploy(
  //   vestingArtifact,
  //   accounts[1], // beneficiary
  //   Math.round(Date.now() / 1000) + 100, // startTime is seconds
  //   120, // cliffDuration in seconds
  //   200, // duration in seconds
  //   false // non-revocable
  // );
  await fair.transfer(vestingBeneficiary.address, "40000000000000000000");
  //await fair.transfer(vestingAccount1.address, "2000000000000000000");
  json.vesting = {
    beneficiary: {
      address: vestingBeneficiary.address
    },
    // account1: {
    //   address: vestingAccount1.address
    // },
    abi: vestingBeneficiary.abi // same for all
  };

  // Test the upgrade process
  //await proxyAdmin.upgrade(fairProxy.address, fairContract.address);

  fs.writeFile(
    `contracts_${network}.json`,
    JSON.stringify(json, null, 2),
    () => {}
  );
};
