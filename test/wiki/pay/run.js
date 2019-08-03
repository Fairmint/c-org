const BigNumber = require("bignumber.js");
const { constants, deployDat, getGasCost } = require("../../helpers");

contract("wiki / pay / run", accounts => {
  let contracts;
  const investor = accounts[3];
  const payAmount = "42000000000000000000";

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "0" // Start in the run state
    });

    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i]
      });
    }
  });

  it("Sanity check: state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.RUN);
  });

  it(
    "revenue_commitment*amount is being added to the buyback_reserve and (1-revenue_commitment)*amount is being transfered to the beneficiary."
  );
  it(
    "Calculate x the number of newly issued FAIRs with x=sqrt((2*revenue_commitment*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)."
  );
  it(
    "If to is specified, then if to is allowed to receive FAIRs,x FAIRs are added to the to address specified, otherwise the function fails. If to is not specified, x FAIRs are added to the beneficiary's balance."
  );
  it(
    "If (x+investor_balance)/(total_supply+burnt_supply) >= burn_threshold then burn((x+investor_balance)-(burn_threshold*(total_supply+burnt_supply)) is called."
  );
  it("The total_supply is increased with x new FAIRs.");
});
