const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("whitelist / configWhitelist", (accounts) => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[5];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount,
    });
  });

  it("Operator cannot change config", async () => {
    await expectRevert(
      contracts.whitelist.configWhitelist(0, 0, { from: operatorAccount }),
      "Ownable: caller is not the owner"
    );
  });

  describe("on config", () => {
    beforeEach(async () => {
      await contracts.whitelist.configWhitelist(42, 84, {
        from: ownerAccount,
      });
    });

    it("startDate updated", async () => {
      const startDate = await contracts.whitelist.startDate();
      assert.equal(startDate, 42);
    });

    it("lockupGranularity updated", async () => {
      const lockupGranularity = await contracts.whitelist.lockupGranularity();
      assert.equal(lockupGranularity, 84);
    });

    describe("on config again", () => {
      beforeEach(async () => {
        await contracts.whitelist.configWhitelist(1, 2, {
          from: ownerAccount,
        });
      });

      it("startDate updated", async () => {
        const startDate = await contracts.whitelist.startDate();
        assert.equal(startDate, 1);
      });

      it("lockupGranularity updated", async () => {
        const lockupGranularity = await contracts.whitelist.lockupGranularity();
        assert.equal(lockupGranularity, 2);
      });
    });
  });
});
