const { constants, deployDat, shouldFail } = require("../helpers");

contract("dat / whitelist / shouldFail", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("shouldFail to init again", async () => {
    await shouldFail(
      contracts.whitelist.initialize(constants.ZERO_ADDRESS, {
        from: accounts[0]
      }),
      "ALREADY_INITIALIZED"
    );
  });

  it("shouldFail to approve by a non-owner", async () => {
    await shouldFail(
      contracts.whitelist.approve(accounts[1], true, { from: accounts[5] }),
      "OWNER_ONLY"
    );
  });

  it("shouldFail if called directly", async () => {
    await shouldFail(
      contracts.whitelist.authorizeTransfer(accounts[1], accounts[1], 1, true),
      "CALL_VIA_DAT_ONLY"
    );
  });
});
