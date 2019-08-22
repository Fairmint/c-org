const { deployDat, shouldFail } = require("../helpers");

contract("dat / erc1404 / canBlock", accounts => {
  let contracts;
  const investor = accounts[9];

  before(async () => {
    contracts = await deployDat(accounts);

    await contracts.erc1404.approve(investor, true, {
      from: await contracts.dat.control()
    });
  });

  it("can buy before", async () => {
    await contracts.dat.buy(investor, "100000000000000000000", 1, {
      value: "100000000000000000000",
      from: investor
    });
  });

  describe("when restriction applies", () => {
    beforeEach(async () => {
      await contracts.erc1404.approve(investor, false, {
        from: await contracts.dat.control()
      });
    });

    it("buy shouldFail", async () => {
      await shouldFail(
        contracts.dat.buy(investor, "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: investor
        })
      );
    });
  });
});
