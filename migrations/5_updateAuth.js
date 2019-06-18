const { updateDatConfig } = require('../helpers');

const authorizationArtifact = artifacts.require('Authorization');
const datArtifact = artifacts.require('DecentralizedAutonomousTrust');

// eslint-disable-next-line no-unused-vars
module.exports = async function updateAuth(deployer) {
  const auth = await authorizationArtifact.deployed();
  await auth.updateDat(datArtifact.address);
  const dat = await datArtifact.deployed();
  await updateDatConfig(dat, { authorizationAddress: auth.address });
};
