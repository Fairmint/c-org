const { deployDat } = require("../../helpers");

contract("wiki / buy / run", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it(
    "If the investor is not allowed to buy FAIR (see compliance), then the function exits."
  );
  it("If amount < min_investment, then the function exits.");
  // Calculate the number of FAIR x that the investor should receive for his investment with x=sqrt((2*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)
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
