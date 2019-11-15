const { approveAll, deployDat } = require("../helpers");

contract("dat / noWhitelist", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, { whitelist: null });
  });

  describe("can pay", () => {
    before(async () => {
      await contracts.dat.pay(accounts[1], "100000000000000000000", {
        value: "100000000000000000000",
        from: accounts[1]
      });
    });

    it("balanceOf should have increased", async () => {
      const balance = await contracts.dat.balanceOf(accounts[1]);

      assert.equal(balance.toString(), "19351446600711869441");
    });
  });
});
