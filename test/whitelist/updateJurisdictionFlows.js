const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / updateJurisdictionFlows", (accounts) => {
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

  it("Operator cannot updateJurisdictionFlows", async () => {
    await reverts(
      contracts.whitelist.updateJurisdictionFlows([1], [1], [1], {
        from: operatorAccount,
      }),
      "Ownable: caller is not the owner"
    );
  });

  it("updateJurisdictionFlows does not accept 0", async () => {
    await reverts(
      contracts.whitelist.updateJurisdictionFlows([0], [1], [1], {
        from: ownerAccount,
      }),
      "INVALID_JURISDICTION_ID"
    );
  });

  it("updateJurisdictionFlows does not accept 0", async () => {
    await reverts(
      contracts.whitelist.updateJurisdictionFlows([1], [0], [1], {
        from: ownerAccount,
      }),
      "INVALID_JURISDICTION_ID"
    );
  });

  // Other tests in readOnly already
});
