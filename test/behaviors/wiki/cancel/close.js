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
          value: "10000000000000000000000",
        }),
        "INVALID_STATE"
      );
    });
  });
};
