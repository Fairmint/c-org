const { deployDat } = require("../datHelpers");

contract("whitelist / message", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("Can read message for 0", async () => {
    const reason = await contracts.whitelist.messageForTransferRestriction(0);
    assert.equal(reason, "SUCCESS");
  });

  it("Can read message for 1", async () => {
    const reason = await contracts.whitelist.messageForTransferRestriction(1);
    assert.equal(reason, "DENIED: JURISDICTION_FLOW");
  });

  it("Can read message for 2", async () => {
    const reason = await contracts.whitelist.messageForTransferRestriction(2);
    assert.equal(reason, "DENIED: LOCKUP");
  });

  it("Can read message for 3", async () => {
    const reason = await contracts.whitelist.messageForTransferRestriction(3);
    assert.equal(reason, "DENIED: USER_UNKNOWN");
  });

  it("Can read message for huge numbers", async () => {
    const reason = await contracts.whitelist.messageForTransferRestriction(-1);
    assert.equal(reason, "DENIED: UNKNOWN_ERROR");
  });
});
