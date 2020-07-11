const {
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const BigNumber = require("bignumber.js");

/**
 * Requires `this.contract`
 * Original source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/test/token/ERC20/behaviors/ERC20Burnable.behavior.js
 */
module.exports = (tokenOwner) => {
  let initialBalance;

  beforeEach(async function () {
    initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
  });

  describe("Behavior / ERC20 / Burn", () => {
    it("sanity check: balance >= 100", async function () {
      const actual = new BigNumber(await this.contract.balanceOf(tokenOwner));
      assert(actual.isGreaterThanOrEqualTo("100"));
    });

    describe("when the given amount is not greater than balance of the sender", () => {
      context("for a zero amount", function () {
        shouldBurn("0");
      });

      context("for a non-zero amount", function () {
        shouldBurn("100");
      });

      function shouldBurn(_amount) {
        const amount = new BigNumber(_amount);
        let tx;

        beforeEach(async function () {
          tx = await this.contract.burn(amount.toFixed(), { from: tokenOwner });
        });

        it("burns the requested amount", async function () {
          const actual = new BigNumber(
            await this.contract.balanceOf(tokenOwner)
          );
          assert.equal(
            actual.toFixed(),
            initialBalance.minus(amount).toFixed()
          );
        });

        it("emits a transfer event", async function () {
          expectEvent.inLogs(tx.logs, "Transfer", {
            from: tokenOwner,
            to: constants.ZERO_ADDRESS,
            value: amount.toFixed(),
          });
        });
      }
    });

    describe("when the given amount is greater than the balance of the sender", () => {
      it("reverts", async function () {
        const amount = initialBalance.plus(1);
        await expectRevert(
          this.contract.burn(amount.toFixed(), { from: tokenOwner }),
          "ERC20: burn amount exceeds balance"
        );
      });
    });
  });
};
