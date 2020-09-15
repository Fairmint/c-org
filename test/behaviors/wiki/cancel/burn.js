const { expectRevert } = require("@openzeppelin/test-helpers");
const constants = require("../../../helpers/constants");

module.exports = function (investor) {
  describe("Behavior / Wiki / Cancel / burn", () => {
    const burnAmount = "42";

    it("Sanity check: state is cancel", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.CANCEL);
    });

    it("Burn fails", async function () {
      await expectRevert(
        this.contract.burn(burnAmount, {
          from: investor,
        }),
        "INVALID_STATE"
      );
    });
  });
};
