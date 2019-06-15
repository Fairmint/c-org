/**
 * Tests buying when not authorized.
 */

const { deployDat, shouldFail } = require('../helpers');

const authorizationArtifact = artifacts.require('Authorization_Pausable');

contract('dat / authCanBlockBuy', (accounts) => {
  let dat;
  let auth;

  before(async () => {
    auth = await authorizationArtifact.new();
    dat = await deployDat({
      initGoal: 99999,
    });
    await auth.updateDat(dat.address);
    await dat.updateAuthorization(auth.address);
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

      assert.equal(balance, 200);
    });

    describe('when blocked', () => {
      before(async () => {
        await auth.setAuthorized(false);
      });

      it('should fail to buy tokens', async () => {
        await shouldFail(dat.buy(100, { value: 100, from: accounts[1] }));
      });

      it('balanceOf should not have changed', async () => {
        const balance = await dat.balanceOf(accounts[1]);

        assert.equal(balance, 200);
      });

      describe('can buy tokens on the 3rd attempt', () => {
        before(async () => {
          await auth.setAuthorized(true);
          await dat.buy(100, { value: 100, from: accounts[1] });
        });

        it('balanceOf should have increased', async () => {
          const balance = await dat.balanceOf(accounts[1]);

          assert.equal(balance, 400);
        });
      });
    });
  });
});
