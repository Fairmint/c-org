const { deployDat } = require("../../helpers");

contract("fair / erc20 / totalSupply", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, { initReserve: 0 });
  });

  it("defaults to 0", async () => {
    assert.equal((await contracts.dat.totalSupply()).toString(), 0);
  });
});
