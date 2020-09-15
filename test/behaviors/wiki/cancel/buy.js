const { expectRevert } = require("@openzeppelin/test-helpers");
const constants = require("../../../helpers/constants");

module.exports = function (control, investor) {
  describe("Behavior / Wiki / Cancel / buy", () => {
    it("state is cancel", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.CANCEL);
    });

    it("The buy() functions fails in cancel state", async function () {
      await expectRevert(
        this.contract.buy(investor, "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: investor,
        }),
        "PRICE_SLIPPAGE"
      );
    });
  });
};
