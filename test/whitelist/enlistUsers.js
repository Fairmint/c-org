const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("whitelist / enlistUsers", (accounts) => {
  let contracts;
  let ownerAccount;

  const operatorAccount = accounts[1];
  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.approveNewUsers(
      [accounts[5], accounts[7]],
      [4, 4],
      {
        from: operatorAccount,
      }
    );
    await contracts.whitelist.addApprovedUserWallets(
      [accounts[5], accounts[5], accounts[7]],
      [accounts[4], accounts[6], accounts[8]],
      {
        from: operatorAccount,
      }
    );
  });

  it("shouldFail when msg.sender is not operatingAccount", async () => {
    await expectRevert(
      contracts.whitelist.enlistUsers([accounts[5]], { from: accounts[8] }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("shouldFail when user id is not approved yet", async () => {
    await expectRevert(
      contracts.whitelist.enlistUsers([accounts[9]], {
        from: operatorAccount,
      }),
      "USER_ID_UNKNOWN"
    );
  });

  it("shouldFail when user id is already enlisted", async () => {
    await contracts.whitelist.enlistUsers([accounts[5]], {
      from: operatorAccount,
    });
    await expectRevert(
      contracts.whitelist.enlistUsers([accounts[5]], {
        from: operatorAccount,
      }),
      "ALREADY_ENLISTED_USER"
    );
  });

  it("should fail if currentUser exceeds total limit", async () => {
    const curInvestors = await contracts.whitelist.currentInvestors();
    await contracts.whitelist.setInvestorLimit(curInvestors, {
      from: ownerAccount,
    });
    await expectRevert(
      contracts.whitelist.enlistUsers([accounts[7]], {
        from: operatorAccount,
      }),
      "EXCEEDING_MAX_INVESTORS"
    );
  });

  it("should fail if currentUser of jurisdiction exceeds jurisdiction limit", async () => {
    const curInvestors = await contracts.whitelist.currentInvestorsByJurisdiction(
      4
    );
    await contracts.whitelist.setInvestorLimitForJurisdiction(
      [4],
      [curInvestors],
      { from: ownerAccount }
    );
    await expectRevert(
      contracts.whitelist.enlistUsers([accounts[7]], {
        from: operatorAccount,
      }),
      "EXCEEDING_JURISDICTION_MAX_INVESTORS"
    );
  });
});
