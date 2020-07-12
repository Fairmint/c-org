const { deployDat } = require("../datHelpers");
const { constants } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / shouldFail", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("shouldFail to init again", async () => {
    await reverts(
      contracts.whitelist.initialize(constants.ZERO_ADDRESS, {
        from: accounts[0],
      }),
      "Contract instance has already been initialized"
    );
  });

  it("shouldFail to approve by a non-operator", async () => {
    await reverts(
      contracts.whitelist.approveNewUsers([accounts[1]], [1], {
        from: accounts[5],
      }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("shouldFail if called directly", async () => {
    await reverts(
      contracts.whitelist.authorizeTransfer(accounts[1], accounts[1], 1, true),
      "CALL_VIA_CONTRACT_ONLY"
    );
  });
});
