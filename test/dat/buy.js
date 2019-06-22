/**
 * Tests the ability to buy dat tokens
 */

const { deployDat } = require("../helpers");

contract("dat / buy", accounts => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat({
      initGoal: "1000000000000000000000"
    });
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

      assert.equal(balance.toString(), "20000");
    });
  });
});
