/**
 * Tests the ability to buy dat tokens
 */

const { deployDat } = require("../helpers");

contract("dat / buy", accounts => {
  let dat;
  let fair;

  before(async () => {
    [dat, fair] = await deployDat(
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
  });
});
