/**
 * Tests the ability to buy c-org tokens
 */

const corgArtifact = artifacts.require('c-org');
const tplInterfaceArtifact = artifacts.require('TPLInterface-AutoApprove');

contract('c-org / buy', (accounts) => {
  let corg;

  before(async () => {
    const tplInterface = await tplInterfaceArtifact.new();
    corg = await corgArtifact.new('Fairmint', 'FSE', 18, 0, tplInterface.address);
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
