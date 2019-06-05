const Migrations = artifacts.require('Migrations');

module.exports = function initialMigration(deployer) {
  deployer.deploy(Migrations);
};
