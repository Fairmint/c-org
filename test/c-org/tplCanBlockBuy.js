/**
 * Tests buying when not authorized by the TPL.
 */

const { deployCorg, shouldFail } = require('../helpers');

const tplInterfaceArtifact = artifacts.require('TPLERC20Interface_FailEveryOther');

contract('c-org / tplCanBlockBuy', (accounts) => {
  let corg;
  let tpl;

  before(async () => {
    tpl = await tplInterfaceArtifact.new();
    corg = await deployCorg({
      initGoal: 99999,
      tplInterfaceAddress: tpl.address,
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

      assert.equal(balance, 4200);
    });

    describe('should fail to buy tokens the 2nd time', () => {
      before(async () => {
        await shouldFail(corg.buy(100, { value: 100, from: accounts[1] }));
      });

      it('balanceOf should not have changed', async () => {
        const balance = await corg.balanceOf(accounts[1]);

        assert.equal(balance, 4200);
      });

      describe('can buy tokens on the 3rd attempt', () => {
        before(async () => {
          await tpl.setAuthorized();
          await corg.buy(100, { value: 100, from: accounts[1] });
        });

        it('balanceOf should have increased', async () => {
          const balance = await corg.balanceOf(accounts[1]);

          assert.equal(balance, 8400);
        });
      });
    });
  });
});
