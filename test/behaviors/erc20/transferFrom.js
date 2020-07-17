const BigNumber = require("bignumber.js");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner, nonTokenHolder, operator) {
  describe("Behavior / ERC20 / TransferFrom", function () {
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
        await this.contract.approve(operator, -1, { from: tokenOwner });
        await this.contract.transferFrom(
          tokenOwner,
          nonTokenHolder,
          transferAmount,
          {
            from: operator,
          }
        );
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
