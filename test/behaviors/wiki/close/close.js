const { constants } = require("../../../helpers");
const { reverts } = require("truffle-assertions");

/**
 * Requires `this.contract`
 */
module.exports = function () {
  describe("Behavior / Wiki / Close / close", function () {
    it("Sanity check: state is close", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.CLOSE);
    });

    it("close should fail", async function () {
      await reverts(
        this.contract.close({
          from: await this.contract.beneficiary(),
          value: "10000000000000000000000",
        }),
        "INVALID_STATE"
      );
    });
  });
};
