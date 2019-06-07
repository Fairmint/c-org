/**
 * Tests the ability to buy c-org tokens
 */

const { deployCorg } = require('../helpers');

const tplInterfaceArtifact = artifacts.require('TPLERC20Interface_AutoApprove');

contract('c-org / buy', (accounts) => {
  let corg;

  before(async () => {
    corg = await deployCorg({
      initGoal: 99999,
      tplInterfaceAddress: (await tplInterfaceArtifact.new()).address,
    });
  });

  it('balanceOf should be 0 by default', async () => {
    const balance = await corg.balanceOf(accounts[1]);

    assert.equal(balance, 0);
  });

  describe('can buy tokens', () => {
    before(async () => {
      await corg.buy(100, { value: 100, from: accounts[1] });
    });

    it('balanceOf should have increased', async () => {
      const balance = await corg.balanceOf(accounts[1]);

      assert.notEqual(balance, 0);
    });
  });
});
