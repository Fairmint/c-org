const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("whitelist / delistUsers", (accounts) => {
  let contracts;

  const operatorAccount = accounts[1];
  beforeEach(async () => {
    contracts = await deployDat(accounts);
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
      contracts.whitelist.delistUsers([accounts[5]], { from: accounts[8] }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("shouldFail when user id is already delisted", async () => {
    await expectRevert(
      contracts.whitelist.delistUsers([accounts[5]], {
        from: operatorAccount,
      }),
      "ALREADY_DELISTED_USER"
    );
  });
});
