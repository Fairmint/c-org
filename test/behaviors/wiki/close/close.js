const { constants } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

/**
 * Requires `this.contract`
 */
module.exports = function (
  investor,
  nonTokenHolder,
  operator,
  areTransactionsFrozen
) {
  describe("Behavior / Wiki / Close / close", function () {
    it("Sanity check: state is close", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.CLOSE);
    });

    it("close should fail", async function () {
      await expectRevert(
        this.contract.close({
          from: await this.contract.beneficiary(),
        }),
        "INVALID_STATE"
      );
    });

    if (!areTransactionsFrozen) {
      it("can transfer on close", async function () {
        await this.contract.transfer(nonTokenHolder, "1", { from: investor });
      });

      it("can transferFrom on close", async function () {
        await this.contract.approve(operator, -1, { from: investor });
        await this.contract.transferFrom(investor, nonTokenHolder, "1", {
          from: operator,
        });
      });
    } else {
      it("shouldFail to transfer on close", async function () {
        await expectRevert(
          this.contract.transfer(nonTokenHolder, "1", { from: investor }),
          "INVALID_STATE"
        );
      });

      it("shouldFail to transferFrom on close", async function () {
        await this.contract.approve(operator, -1, { from: investor });
        await expectRevert(
          this.contract.transferFrom(investor, nonTokenHolder, "1", {
            from: operator,
          }),
          "INVALID_STATE"
        );
      });
    }
  });
};
