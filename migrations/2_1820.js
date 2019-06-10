const erc1820 = require('erc1820');

module.exports = function deploy1820(deployer) {
  // TODO skip if network != local
  erc1820.deploy(web3);
};
