const BigNumber = require("bignumber.js");
const { constants, deployDat, shouldFail } = require("../../helpers");

contract("wiki / buy / run", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0
    });
  });

  it("state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state, constants.STATE.RUN);
  });

  describe("If the investor is not allowed to buy FAIR (see compliance), then the function exits.", () => {
    before(async () => {
      await contracts.erc1404.updateRestriction(1);
    });

    it("should fail to buy", async () => {
      await shouldFail(
        contracts.dat.buy(accounts[5], "100000000000000000000", 1, {
          from: accounts[5],
          value: "100000000000000000000"
        })
      );
    });
  });

  it("If amount < min_investment, then the function exits.", async () => {
    const amount = new BigNumber(await contracts.dat.minInvestment()).minus(1);
    await shouldFail(
      contracts.dat.buy(accounts[5], amount.toFixed(), 1, {
        from: accounts[5],
        value: amount.toFixed()
      })
    );
  });

  describe("Calculate the number of FAIR x that the investor should receive for his investment", () => {
    let x;

    before(async () => {
      await contracts.dat.buy(accounts[5], "100000000000000000000", 1, {
        from: accounts[5],
        value: "100000000000000000000"
      });
    });

    // x=sqrt((2*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)

    it("If x < minimum then the call fails.");

    it("Add x FAIRs to the investor's balance.");
    it("Increase total_supply with x new FAIRs.");
    describe("If the investor is the beneficiary", () => {
      describe("if (x+investor_balance)/(total_supply+burnt_supply) >= burn_threshold", () => {
        it(
          "burn((x+investor_balance)-(burn_threshold*(total_supply+burnt_supply))"
        );
      });
      describe("if (x+investor_balance)/(total_supply+burnt_supply) < burn_threshold", () => {
        it("no burn");
      });
      it("the full amount is added to the buyback_reserve");
    });
    describe("If the investor is not the beneficiary", () => {
      it("investment_reserve*amount is being added to the buyback_reserve");
      it(
        "(1-investment_reserve)*amount*(1-fee) is being transfered to beneficiary"
      );
      it("(1-investment_reserve)*amount*fee is being sent to fee_collector");
    });
  });
});
