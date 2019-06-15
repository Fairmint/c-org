/**
 * Tests the ability to buy dat tokens
 */

const { deployDat } = require('../helpers');

contract('dat / buy', (accounts) => {
  let dat;

  before(async () => {
    dat = await deployDat({
      initGoal: 99999,
    });
  });

  it('balanceOf should be 0 by default', async () => {
    const balance = await dat.balanceOf(accounts[1]);

    assert.equal(balance, 0);
  });

  describe('can buy tokens', () => {
    before(async () => {
      await dat.buy(100, { value: 100, from: accounts[1] });
    });

    it('balanceOf should have increased', async () => {
      const balance = await dat.balanceOf(accounts[1]);

      assert.notEqual(balance, 0);
    });
  });
});
