const { expectRevert } = require("@openzeppelin/test-helpers");
const { constants } = require("hardlydifficult-eth");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner, operator) {
  describe("Behavior / ERC20 / burnFrom", function () {
    const burnAmount = 20;

    it("should fail to burnFrom without approval", async function () {
      await expectRevert(
        this.contract.burnFrom(tokenOwner, burnAmount, { from: operator }),
        "ERC20: burn amount exceeds allowance"
      );
    });

    describe("can burn", function () {
      let accountBalanceBefore;

      beforeEach(async function () {
        accountBalanceBefore = await this.contract.balanceOf(tokenOwner);
        await this.contract.approve(operator, constants.MAX_UINT, {
          from: tokenOwner,
        });
        await this.contract.burnFrom(tokenOwner, burnAmount, {
          from: operator,
        });
      });

      it("account balance went down", async function () {
        assert.equal(
          (await this.contract.balanceOf(tokenOwner)).toString(),
          accountBalanceBefore.subn(burnAmount).toString()
        );
      });
    });
  });
};
