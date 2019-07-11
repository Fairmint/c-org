/**
 * Tests buying when not authorized.
 */

const { deployDat, shouldFail } = require("../../helpers");

contract("dat / auth / canBlockBuy", accounts => {
  let dat;
  let fair;
  let auth;

  before(async () => {
    [dat, fair, auth] = await deployDat(
      {
      },
      accounts[0]
    );
  });

  it("balanceOf should be 0 by default", async () => {
    const balance = await fair.balanceOf(accounts[1]);

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
      const balance = await fair.balanceOf(accounts[1]);

      assert.equal(balance.toString(), "105526268847200000000");
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
        const balance = await fair.balanceOf(accounts[1]);

        assert.equal(balance.toString(), "105526268847200000000");
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
          const balance = await fair.balanceOf(accounts[1]);

          assert.equal(balance.toString(), "162362423160300000000");
        });
      });
    });
  });
});
