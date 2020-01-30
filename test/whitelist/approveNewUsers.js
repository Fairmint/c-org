const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / approveNewUsers", accounts => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[5];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount
    });
  });

  it("non-operators cannot approveNewUsers", async () => {
    await reverts(
      contracts.whitelist.approveNewUsers([accounts[5]], [4], {
        from: accounts[9]
      }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("operators can approveNewUsers", async () => {
    await contracts.whitelist.approveNewUsers([accounts[5]], [4], {
      from: operatorAccount
    });
  });

  it("should fail to approve a 0 jurisdiction", async () => {
    await reverts(
      contracts.whitelist.approveNewUsers([accounts[5]], [0], {
        from: operatorAccount
      }),
      "INVALID_JURISDICTION_ID"
    );
  });

  describe("after approval", () => {
    beforeEach(async () => {
      await contracts.whitelist.approveNewUsers([accounts[5]], [4], {
        from: operatorAccount
      });
    });

    it("getAuthorizedUserIdInfo updated", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex
      } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[5]);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked, 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("getAuthorizedUserIdInfo updated", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex
      } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[5]);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked, 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("should fail to approve a known user", async () => {
      await reverts(
        contracts.whitelist.approveNewUsers([accounts[5]], [4], {
          from: operatorAccount
        }),
        "USER_ALREADY_ADDED"
      );
    });
  });
});
