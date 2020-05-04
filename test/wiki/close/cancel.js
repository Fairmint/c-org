const { approveAll, constants, deployDat } = require("../../helpers");
const { reverts } = require("truffle-assertions");

contract("wiki / close / cancel", (accounts) => {
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

    await contracts.dat.close({ from: accounts[0] });
  });

  it("Sanity check: state is cancel", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.CANCEL);
  });

  it("close should fail", async () => {
    await reverts(
      contracts.dat.close({
        from: await contracts.dat.beneficiary(),
        value: "10000000000000000000000",
      }),
      "INVALID_STATE"
    );
  });
});
