const { approveAll, deployDat } = require("../helpers");

contract("dat / erc1404 / restrictionCode", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
    await approveAll(contracts, accounts);
  });

  it("Can read status 0", async () => {
    const restriction = await contracts.fair.detectTransferRestriction(
      accounts[0],
      accounts[1],
      42
    );
    assert.equal(restriction.toString(), 0);
  });

  describe("when restriction applies", () => {
    beforeEach(async () => {
      await contracts.erc1404.approve(accounts[1], false, {
        from: await contracts.dat.control()
      });
    });

    it("Can read status 1", async () => {
      const restriction = await contracts.fair.detectTransferRestriction(
        accounts[0],
        accounts[1],
        42
      );
      assert.equal(restriction.toString(), 1);
    });
  });
});
