const { approveAll, constants, deployDat } = require("../../helpers");
const { reverts } = require("truffle-assertions");

contract("wiki / burn / run", (accounts) => {
  let contracts;
  const investor = accounts[3];
  const burnAmount = "42";

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

  it("Burn fails", async () => {
    await reverts(
      contracts.dat.burn(burnAmount, {
        from: investor,
      }),
      "ONLY_DURING_RUN"
    );
  });
});
