const { deployDat } = require("../../helpers");

contract("fse / erc777 / granularity", () => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat();
  });

  it("should have granularity 1", async () => {
    /**
     * Currently hard-coded to 1 as we have not identified a compelling use case for this.
     */
    assert.equal(await fse.granularity(), 1);
  });
});
