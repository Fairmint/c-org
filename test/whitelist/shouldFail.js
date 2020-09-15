const { deployDat } = require("../datHelpers");
const { constants } = require("../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("whitelist / shouldFail", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("shouldFail to init again", async () => {
    await expectRevert(
      contracts.whitelist.initialize(constants.ZERO_ADDRESS, {
        from: accounts[0],
      }),
      "Contract instance has already been initialized"
    );
  });

  it("shouldFail to approve by a non-operator", async () => {
    await expectRevert(
      contracts.whitelist.approveNewUsers([accounts[1]], [1], {
        from: accounts[5],
      }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("shouldFail if called directly", async () => {
    await expectRevert(
      contracts.whitelist.authorizeTransfer(accounts[1], accounts[1], 1, true),
      "CALL_VIA_CONTRACT_ONLY"
    );
  });
});
