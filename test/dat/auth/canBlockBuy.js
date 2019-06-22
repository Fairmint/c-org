/**
 * Tests buying when not authorized.
 */

const { deployDat, shouldFail, updateDatConfig } = require("../../helpers");

const authArtifact = artifacts.require("Authorization_Pausable");

contract("dat / auth / canBlockBuy", accounts => {
  let dat;
  let fse;
  let auth;

  before(async () => {
    [dat, fse] = await deployDat({
      initGoal: 99999
    });
    auth = await authArtifact.new(dat.address);
    await updateDatConfig(
      dat,
      fse,
      {
        authorizationAddress: auth.address,
        name: "Fairmint Fair Synthetic Equity", // TODO remove
        symbol: "FSE"
      },
      accounts[0]
    );
  });

  it("balanceOf should be 0 by default", async () => {
    const balance = await fse.balanceOf(accounts[1]);

    assert.equal(balance, 0);
  });

  describe("can buy tokens", () => {
    before(async () => {
      await dat.buy(accounts[1], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[1]
      });
    });

    it("balanceOf should have increased", async () => {
      const balance = await fse.balanceOf(accounts[1]);

      assert.equal(balance.toString(), "200002000020000200002");
    });

    describe("when blocked", () => {
      before(async () => {
        await auth.setAuthorized(false);
      });

      it("should fail to buy tokens", async () => {
        await shouldFail(
          dat.buy(accounts[1], "100000000000000000000", 1, {
            value: "100000000000000000000",
            from: accounts[1]
          })
        );
      });

      it("balanceOf should not have changed", async () => {
        const balance = await fse.balanceOf(accounts[1]);

        assert.equal(balance.toString(), "200002000020000200002");
      });

      describe("can buy tokens on the 3rd attempt", () => {
        before(async () => {
          await auth.setAuthorized(true);
          await dat.buy(accounts[1], "100000000000000000000", 1, {
            value: "100000000000000000000",
            from: accounts[1]
          });
        });

        it("balanceOf should have increased", async () => {
          const balance = await fse.balanceOf(accounts[1]);

          assert.equal(balance.toString(), "400004000040000400004");
        });
      });
    });
  });
});
