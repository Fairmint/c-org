const { deployDat, constants } = require('../../helpers');

contract('dat / erc777 / defaultOperators', () => {
  let dat;

  before(async () => {
    dat = await deployDat();
  });

  it('should have no default operators', async () => {
    /**
     * Hard-coded to no default operators as we have not identified a compelling use
     * case for this and to simplify the token implementation.
     */
    assert.equal(await dat.defaultOperators(), [constants.ZERO_ADDRESS]);
  });
});
