const { deployDat } = require('../../helpers');

contract('dat / erc20 / decimals', () => {
  let dat;

  before(async () => {
    dat = await deployDat();
  });

  it('should have 18 decimals', async () => {
    /**
     * Per ERC-777 this value must always be exactly 18.
     */
    assert.equal(await dat.decimals(), 18);
  });
});
