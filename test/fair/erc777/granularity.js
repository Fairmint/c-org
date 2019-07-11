const { deployDat } = require("../../helpers");

contract("fair / erc777 / granularity", accounts => {
  // eslint-disable-next-line no-unused-vars
  let dat;
  let fair;

  before(async () => {
    [dat, fair] = await deployDat(undefined, accounts[0]);
  });

  it("should have granularity 1", async () => {
    /**
     * Currently hard-coded to 1 as we have not identified a compelling use case for this.
     */
    assert.equal(await fair.granularity(), 1);
  });
});
