const { approveAll, constants, deployDat } = require("../../helpers");
const { reverts } = require("truffle-assertions");

contract("wiki / pay / cancel", (accounts) => {
  let contracts;
  const investor = accounts[3];

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

  it("pay should fail", async () => {
    await reverts(
      contracts.dat.pay("1", {
        from: investor,
        value: "1",
      }),
      "INVALID_STATE"
    );
  });
});
