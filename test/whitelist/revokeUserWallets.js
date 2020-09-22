const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("whitelist / revokeUserWallets", (accounts) => {
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
    await contracts.whitelist.addApprovedUserWallets(
      [accounts[5], accounts[5]],
      [accounts[4], accounts[6]],
      {
        from: operatorAccount,
      }
    );
    // to activate wallet
    await contracts.dat.buy(accounts[6], "100000000000000000000", 1, {
      value: "100000000000000000000",
      from: accounts[6],
    });
  });

  it("sanity check: trader can buy", async () => {
    await contracts.dat.buy(accounts[4], "100000000000000000000", 1, {
      value: "100000000000000000000",
      from: accounts[4],
    });
  });

  it("cannot revoke an unknown wallet", async () => {
    await expectRevert(
      contracts.whitelist.revokeUserWallets([accounts[9]], {
        from: operatorAccount,
      }),
      "WALLET_NOT_FOUND"
    );
  });

  it("cannot revoke active wallet", async () => {
    await expectRevert(
      contracts.whitelist.revokeUserWallets([accounts[6]], {
        from: operatorAccount,
      }),
      "ATTEMPT_TO_REVOKE_ACTIVE_WALLET"
    );
  });

  describe("on revoke user id", () => {
    beforeEach(async () => {
      await contracts.whitelist.revokeUserWallets([accounts[5]], {
        from: operatorAccount,
      });
    });

    it("cannot buy", async () => {
      await expectRevert(
        contracts.dat.buy(accounts[5], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[5],
        }),
        "USER_UNKNOWN"
      );
    });
  });

  describe("on revoke wallet", () => {
    beforeEach(async () => {
      await contracts.whitelist.revokeUserWallets([accounts[4]], {
        from: operatorAccount,
      });
    });

    it("cannot buy", async () => {
      await expectRevert(
        contracts.dat.buy(accounts[4], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[4],
        }),
        "USER_UNKNOWN"
      );
    });
  });
});
