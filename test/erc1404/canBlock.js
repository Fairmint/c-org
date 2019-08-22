const { deployDat, shouldFail } = require("../helpers");

contract("dat / erc1404 / canBlock", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("can buy before", async () => {
    await contracts.dat.buy(accounts[1], "100000000000000000000", 1, {
      value: "100000000000000000000",
      from: accounts[1]
    });
  });

  describe("when restriction applies", () => {
    it("buy shouldFail", async () => {
      await shouldFail(
        contracts.dat.buy(accounts[1], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[1]
        })
      );
    });
  });
});
