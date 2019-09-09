const { shouldFail, deployDat, updateDatConfig } = require("../../helpers");

contract("fair / erc20 / decimals", () => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("should have 18 decimals", async () => {
    /**
     * Per ERC-777 this value must always be exactly 18.
     */
    assert.equal(await contracts.dat.decimals(), 18);
  });
});
