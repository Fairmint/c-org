const { approveAll, deployDat } = require("../helpers");

contract("dat / whitelist / restrictionCode", accounts => {
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    await approveAll(contracts, accounts);
  });

  it("Can read status 0", async () => {
    const restriction = await contracts.whitelist.detectTransferRestriction(
      accounts[0],
      accounts[1],
      42
    );
    assert.equal(restriction.toString(), 0);
  });

  describe("when restriction applies", () => {
    beforeEach(async () => {
      await contracts.whitelist.updateJurisdictionsForUserIds(
        [accounts[1]],
        [-1],
        {
          from: await contracts.dat.control()
        }
      );
    });

    it("Can read status 1", async () => {
      const restriction = await contracts.whitelist.detectTransferRestriction(
        accounts[0],
        accounts[1],
        42
      );
      assert.equal(restriction.toString(), 1);
    });
  });
});
