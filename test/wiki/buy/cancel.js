const {
  approveAll,
  constants,
  deployDat,
  shouldFail
} = require("../../helpers");

contract("wiki / buy / cancel", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "1000000000000000000000" // 10x the buy size below
    });

    await approveAll(contracts, accounts);
  });

  it("Sanity check: state is init", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.INIT);
  });

  it("Sanity check: buy() works durning init", async () => {
    await contracts.dat.buy(accounts[9], "100000000000000000000", 1, {
      value: "100000000000000000000",
      from: accounts[9]
    });
  });

  it("Sanity check: state is still init", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.INIT);
  });

  describe("cancel", () => {
    before(async () => {
      await contracts.dat.close({ from: accounts[0] });
    });

    it("state is cancel", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.CANCEL);
    });

    it("The buy() functions fails in cancel state", async () => {
      await shouldFail(
        contracts.dat.buy(accounts[9], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[9]
        })
      );
    });
  });
});
