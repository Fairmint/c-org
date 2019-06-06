/**
 * Tests the ability to buy c-org tokens
 */

const corgArtifact = artifacts.require('c-org');

contract('c-org / buy', (accounts) => {
  let corg;

  before(async () => {
    corg = await corgArtifact.deployed();
  });

  it('balanceOf should be 0 by default', async () => {
    const balance = await corg.balanceOf(accounts[1]);

    assert.equal(balance, 0);
  });

  describe('can buy tokens', () => {
    before(async () => {
      await corg.buy({ value: 100, from: accounts[1] });
    });

    it('balanceOf should have increased', async () => {
      const balance = await corg.balanceOf(accounts[1]);

      assert.notEqual(balance, 0);
    });
  });
});
