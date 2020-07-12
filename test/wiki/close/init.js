const { deployDat } = require("../../datHelpers");
const { approveAll, constants } = require("../../helpers");

contract("wiki / close / init", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "10000000000000000000000",
    });

    await approveAll(contracts, accounts);

    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i],
      });
    }
  });

  it("Sanity check: state is init", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.INIT);
  });

  it("exitFee estimate is 0", async () => {
    const fee = await contracts.dat.estimateExitFee(0);
    assert.equal(fee, 0);
  });

  describe("on close", () => {
    beforeEach(async () => {
      await contracts.dat.close({
        from: await contracts.dat.beneficiary(),
      });
    });

    it("State is set to cancel", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.CANCEL);
    });
  });
});
