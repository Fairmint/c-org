module.exports = async function approveAll(contracts, accounts) {
  const control = await contracts.dat.control();
  const beneficiary = await contracts.dat.beneficiary();
  const feeCollector = await contracts.dat.feeCollector();
  const accountsToAdd = [];
  const jurisdictions = [];
  for (let i = 0; i < 10; i++) {
    if (
      accounts[i] != control &&
      accounts[i] != beneficiary &&
      accounts[i] != feeCollector
    ) {
      accountsToAdd.push(accounts[i]);
      jurisdictions.push(4);
    }
  }
  await contracts.whitelist.approveNewUsers(accountsToAdd, jurisdictions, {
    from: control,
  });
};
