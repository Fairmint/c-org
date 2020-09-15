const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("whitelist / addApprovedUserWallets", (accounts) => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[9];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount,
    });
    await contracts.whitelist.approveNewUsers([accounts[5]], [4], {
      from: operatorAccount,
    });
  });

  it("non-operators cannot addApprovedUserWallets", async () => {
    await expectRevert(
      contracts.whitelist.addApprovedUserWallets([accounts[5]], [accounts[4]], {
        from: accounts[8],
      }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("operators can addApprovedUserWallets", async () => {
    await contracts.whitelist.addApprovedUserWallets(
      [accounts[5]],
      [accounts[4]],
      {
        from: operatorAccount,
      }
    );
  });

  it("shouldFail to add known wallets 1", async () => {
    await expectRevert(
      contracts.whitelist.addApprovedUserWallets([accounts[5]], [accounts[5]], {
        from: operatorAccount,
      }),
      "WALLET_ALREADY_ADDED"
    );
  });

  describe("after addApprovedUserWallets", () => {
    beforeEach(async () => {
      await contracts.whitelist.addApprovedUserWallets(
        [accounts[5]],
        [accounts[4]],
        {
          from: operatorAccount,
        }
      );
    });

    it("shouldFail to add known wallets 2", async () => {
      await expectRevert(
        contracts.whitelist.addApprovedUserWallets(
          [accounts[5]],
          [accounts[4]],
          {
            from: operatorAccount,
          }
        ),
        "WALLET_ALREADY_ADDED"
      );
    });

    it("shouldFail to add to unknown userIds", async () => {
      await expectRevert(
        contracts.whitelist.addApprovedUserWallets(
          [accounts[8]],
          [accounts[7]],
          {
            from: operatorAccount,
          }
        ),
        "USER_ID_UNKNOWN"
      );
    });

    describe("change to an invalid jurisdiction id", () => {
      beforeEach(async () => {
        await contracts.dat.buy(accounts[5], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[5],
        });
        // This jurisdiction id is not approved to do anything
        await contracts.whitelist.updateJurisdictionsForUserIds(
          [accounts[5]],
          [99],
          { from: operatorAccount }
        );
      });

      it("User can transfer between wallets", async () => {
        await contracts.dat.transfer(accounts[4], 1, { from: accounts[5] });
      });

      it("no transfer restriction when transferring between wallets", async () => {
        assert.equal(
          await contracts.whitelist.detectTransferRestriction(
            accounts[5],
            accounts[4],
            1,
            { from: accounts[5] }
          ),
          0
        );
      });
    });
  });
});
