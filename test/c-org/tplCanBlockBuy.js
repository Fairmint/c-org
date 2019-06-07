/**
 * Tests buying when not authorized by the TPL.
 */

import { deployCorg, shouldFail } from '../helpers';

const tplInterfaceArtifact = artifacts.require('TPLInterface_FailEveryOther');

contract('c-org / tplCanBlockBuy', (accounts) => {
  let corg;

  before(async () => {
    corg = await deployCorg({
      tplInterfaceAddress: (await tplInterfaceArtifact.new()).address,
    });
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

      assert.equal(balance, 4200);
    });

    describe('should fail to buy tokens the 2nd time', () => {
      before(async () => {
        await shouldFail(corg.buy({ value: 100, from: accounts[1] }));
      });

      it('balanceOf should not have changed', async () => {
        const balance = await corg.balanceOf(accounts[1]);

        assert.equal(balance, 4200);
      });

      describe('can buy tokens on the 3rd attempt', () => {
        before(async () => {
          await corg.buy({ value: 100, from: accounts[1] });
        });

        it('balanceOf should have increased', async () => {
          const balance = await corg.balanceOf(accounts[1]);

          assert.equal(balance, 8400);
        });
      });
    });
  });
});
