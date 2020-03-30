const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / addApprovedUserWallets", (accounts) => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[5];

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
    await reverts(
      contracts.whitelist.addApprovedUserWallets([accounts[5]], [accounts[4]], {
        from: accounts[9],
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
    await reverts(
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
      await reverts(
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
      await reverts(
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
  });
});
