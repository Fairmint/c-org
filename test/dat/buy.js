/**
 * Tests the ability to buy dat tokens
 */

const { approveAll, deployDat } = require("../helpers");

contract("dat / buy", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
    await approveAll(contracts, accounts);
  });

  it("balanceOf should be 0 by default", async () => {
    const balance = await contracts.dat.balanceOf(accounts[1]);

    assert.equal(balance, 0);
  });

  describe("can buy tokens", () => {
    before(async () => {
      await contracts.dat.buy(accounts[1], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[1]
      });
    });

    it("balanceOf should have increased", async () => {
      const balance = await contracts.dat.balanceOf(accounts[1]);

      assert.equal(balance.toString(), "105526268847200000000");
    });
  });
});
