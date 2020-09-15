const { constants } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (investor) {
  describe("Behavior / Wiki / Init / burn", () => {
    const burnAmount = "42";

    beforeEach(async function () {
      await this.contract.buy(investor, "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: investor,
      });
    });

    it("Sanity check: state is init", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.INIT);
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
