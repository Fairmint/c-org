const BigNumber = require("bignumber.js");
const { getGasCost } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (beneficiary, investors) {
  describe("Behavior / Wiki / Run / sell", () => {
    const sellAmount = "1000000000000000000";

    it("If init_goal=0 && buyback_reserve=0, then the function exits.", async function () {
      await this.contract.transfer(investors[0], sellAmount, {
        from: beneficiary,
      });
      await expectRevert(
        this.contract.sell(investors[0], sellAmount, 1, { from: investors[0] }),
        "PRICE_SLIPPAGE"
      );
    });
  });
};
