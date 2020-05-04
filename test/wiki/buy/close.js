const { approveAll, constants, deployDat } = require("../../helpers");
const { reverts } = require("truffle-assertions");

contract("wiki / buy / close", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "0", // Start in the run state
    });

    await approveAll(contracts, accounts);
  });

  it("Sanity check: state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.RUN);
  });

  it("Sanity check: buy() works durning run", async () => {
    await contracts.dat.buy(accounts[9], "100000000000000000000", 1, {
      value: "100000000000000000000",
      from: accounts[9],
    });
  });

  describe("close", () => {
    before(async () => {
      await contracts.dat.close({
        from: accounts[0],
        value: "1000000000000000000000",
      });
    });

    it("state is close", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.CLOSE);
    });

    it("The buy() functions fails in close state", async () => {
      await reverts(
        contracts.dat.buy(accounts[9], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[9],
        }),
        "PRICE_SLIPPAGE"
      );
    });
  });
});
