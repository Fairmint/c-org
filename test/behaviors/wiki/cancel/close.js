const { expectRevert } = require("@openzeppelin/test-helpers");
const constants = require("../../../helpers/constants");

module.exports = function (beneficiary) {
  describe("Behavior / Wiki / Cancel / close", () => {
    it("Sanity check: state is cancel", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.CANCEL);
    });

    it("close should fail", async function () {
      await expectRevert(
        this.contract.close({
          from: await beneficiary,
          value: this.contract.estimateExitFee
            ? "10000000000000000000000"
            : "0",
        }),
        "INVALID_STATE"
      );
    });
  });
};
