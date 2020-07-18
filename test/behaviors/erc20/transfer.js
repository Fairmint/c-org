const BigNumber = require("bignumber.js");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner, nonTokenHolder) {
  describe("Behavior / ERC20 / Transfer", function () {
    let initialBalance;

    beforeEach(async function () {
      initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
    });

    it("has expected balance before transfer", async function () {
      assert.equal(
        (await this.contract.balanceOf(tokenOwner)).toString(),
        initialBalance.toFixed()
      );
      assert.equal(await this.contract.balanceOf(nonTokenHolder), 0);
    });

    describe("can transfer funds", function () {
      const transferAmount = 42;

      beforeEach(async function () {
        await this.contract.transfer(nonTokenHolder, transferAmount, {
          from: tokenOwner,
        });
      });

      it("has expected after after transfer", async function () {
        assert.equal(
          (await this.contract.balanceOf(tokenOwner)).toString(),
          initialBalance.minus(transferAmount).toFixed()
        );
        assert.equal(
          (await this.contract.balanceOf(nonTokenHolder)).toString(),
          transferAmount
        );
      });
    });
  });
};
