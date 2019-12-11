module.exports = {
  skipFiles: ['Dependencies.sol', 'Migrations.sol', 'test-artifacts/', 'interfaces/'],
  providerOptions: {
    total_accounts: 100,
    default_balance_ether: 10000000000,
    hardfork: 'istanbul'
  },
  mocha: {
    reporter: null
  }
};
