const { deployDat } = require("../../helpers");

contract("fair / erc777 / granularity", accounts => {
  // eslint-disable-next-line no-unused-vars
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("should have granularity 1", async () => {
    /**
     * Currently hard-coded to 1 as we have not identified a compelling use case for this.
     */
    assert.equal(await contracts.fair.granularity(), 1);
  });
});
