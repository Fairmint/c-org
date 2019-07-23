const { deployDat } = require("../helpers");

contract("dat / erc1404 / restrictionCode", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("Can read status 0", async () => {
    const restriction = await contracts.erc1404.detectTransferRestriction(accounts[0], accounts[1], 42);
    assert.equal(restriction.toString(), 0);
  });

  describe("when restriction applies", () => {
    before(async () => {
      await contracts.erc1404.updateRestriction(1);
    });

    it("Can read status 1", async () => {
      const restriction = await contracts.erc1404.detectTransferRestriction(accounts[0], accounts[1], 42);
      assert.equal(restriction.toString(), 1);
    });
  });
});
