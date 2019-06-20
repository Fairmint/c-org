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
      await dat.buy(
        accounts[1],
        '100000000000000000000',
        1,
        web3.utils.asciiToHex(''),
        web3.utils.asciiToHex(''),
        { value: '100000000000000000000', from: accounts[1] },
      );
    });

    it('balanceOf should have increased', async () => {
      const balance = await dat.balanceOf(accounts[1]);

      assert.notEqual(balance.toString(), 0);
    });
  });
});
