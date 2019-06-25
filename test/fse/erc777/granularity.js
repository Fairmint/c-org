const { deployDat } = require("../../helpers");

contract("fse / erc777 / granularity", accounts => {
  // eslint-disable-next-line no-unused-vars
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat(undefined, accounts[0]);
  });

  it("should have granularity 1", async () => {
    /**
     * Currently hard-coded to 1 as we have not identified a compelling use case for this.
     */
    assert.equal(await fse.granularity(), 1);
  });
});
