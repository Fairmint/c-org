const erc1820 = require('erc1820');

// eslint-disable-next-line no-unused-vars
module.exports = async function deploy1820(deployer) {
  // TODO skip if network != local
  await erc1820.deploy(web3);
};
