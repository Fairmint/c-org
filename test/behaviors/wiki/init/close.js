const { constants } = require("../../../helpers");

module.exports = function (beneficiary) {
  describe("Behavior / Wiki / Init / close", () => {
    it("Sanity check: state is init", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.INIT);
    });

    it("exitFee estimate is 0", async function () {
      if (this.contract.estimateExitFee) {
        const fee = await this.contract.estimateExitFee(0);
        assert.equal(fee, 0);
      }
    });

    describe("on close", function () {
      beforeEach(async function () {
        await this.contract.close({
          from: await beneficiary,
        });
      });

      it("State is set to cancel", async function () {
        const state = await this.contract.state();
        assert.equal(state.toString(), constants.STATE.CANCEL);
      });
    });
  });
};
