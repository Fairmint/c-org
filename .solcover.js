module.exports = {
  skipFiles: ['Dependencies.sol', 'Migrations.sol', 'test-artifacts/'],
  providerOptions: {
    total_accounts: 100,
    default_balance_ether: 10000000000
  },
  mocha: {
    reporter: null
  }
};
