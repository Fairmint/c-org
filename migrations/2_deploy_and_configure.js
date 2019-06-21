const erc1820 = require('erc1820');
const { updateDatConfig } = require('../helpers');

const authorizationArtifact = artifacts.require('Authorization');
const fseArtifact = artifacts.require('FairSyntheticEquity');
const datArtifact = artifacts.require('DecentralizedAutonomousTrust');

module.exports = async function deployAndConfigure(deployer, network, accounts) {
  if (network === 'development') {
    await erc1820.deploy(web3);
  }

  await deployer.deploy(
    authorizationArtifact,
    0, // initLockup
  );
  await deployer.deploy(fseArtifact);
  await deployer.deploy(
    datArtifact,
    '42000000000000000000', // initReserve
    '0x0000000000000000000000000000000000000000', // currencyAddress
    '0', // initGoal
    '0', // initDeadline
    '1', // buySlopeNum
    '100000', // buySlopeDen
    '1', // investmentReserveNum
    '10', // investmentReserveDen
    '1', // revenueCommitementNum
    '10', // revenueCommitementDen
  );
  const auth = await authorizationArtifact.deployed();
  await auth.updateDat(datArtifact.address);
  const dat = await datArtifact.deployed();
  await updateDatConfig(dat, { authorizationAddress: auth.address }, accounts[0]);
};
