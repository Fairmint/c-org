const { deployDat } = require('../../helpers');

contract('dat / erc777 / granularity', () => {
  let dat;

  before(async () => {
    dat = await deployDat();
  });

  it('should have granularity 1', async () => {
    /**
     * Currently hard-coded to 1 as we have not identified a compelling use case for this.
     */
    assert.equal(await dat.granularity(), 1);
  });
});
