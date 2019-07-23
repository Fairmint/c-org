const { deployDat } = require("../helpers");

contract("dat / erc1404 / uint8", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("Can read message for 0", async () => {
    const reason = await contracts.erc1404.messageForTransferRestriction(0);
    assert.equal(reason, "SUCCESS");
  });

  it("Can read message for 1", async () => {
    const reason = await contracts.erc1404.messageForTransferRestriction(1);
    assert.equal(reason, "DENIED");
  });

  it("Can read message for huge numbers", async () => {
    const reason = await contracts.erc1404.messageForTransferRestriction(-1);
    assert.equal(reason, "UNKNOWN_ERROR");
  });
});
