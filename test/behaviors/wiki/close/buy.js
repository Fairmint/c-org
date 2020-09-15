const { constants } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

/**
 * Requires `this.contract`
 */
module.exports = function (investor) {
  describe("Behavior / Wiki / Close / buy", function () {
    it("Sanity check: state is close", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.CLOSE);
    });

    it("The buy() functions fails in close state", async function () {
      const value = web3.utils.toWei("100", "ether");
      await expectRevert(
        this.contract.buy(investor, value, 1, {
          value,
          from: investor,
        }),
        "PRICE_SLIPPAGE"
      );
    });
  });
};
