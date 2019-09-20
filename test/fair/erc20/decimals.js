const { shouldFail, deployDat, updateDatConfig } = require("../../helpers");

contract("fair / erc20 / decimals", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("should have 18 decimals", async () => {
    assert.equal(await contracts.dat.decimals(), 18);
  });
});
