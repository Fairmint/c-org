module.exports = async function approveAll(contracts, accounts) {
  const control = await contracts.dat.control();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      contracts.erc1404.approve(accounts[i], true, {
        from: control
      })
    );
  }
  await Promise.all(promises);
};
