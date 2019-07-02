/**
 * Tests buying when not authorized.
 */

const { deployDat, shouldFail, updateDatConfig } = require("../../helpers");

const tplArtifact = artifacts.require("TestTPLAttributeRegistry");
const authArtifact = artifacts.require("Authorization_Pausable");

contract("dat / auth / canBlockBuy", accounts => {
  let dat;
  let fair;
  let auth;

  before(async () => {
    [dat, fair] = await deployDat(
      {
        initGoal: "1000000000000000000000"
      },
      accounts[0]
    );
    const tpl = await tplArtifact.new();
    auth = await authArtifact.new(
      fair.address,
      tpl.address,
      [42],
      [0, 0],
      [0, 0, 0]
    );
    console.log((await auth.getInvestorTypeOf(accounts[1])).toString());
    await updateDatConfig(
      dat,
      fair,
      {
        authorizationAddress: auth.address
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

      assert.equal(balance.toString(), "20000");
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

        assert.equal(balance.toString(), "20000");
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

          assert.equal(balance.toString(), "40000");
        });
      });
    });
  });
});
