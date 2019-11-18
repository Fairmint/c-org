// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const { expect } = require("chai");

function shouldBehaveLikeERC20Burnable(owner, initialBalance, [burner]) {
  describe("burn", function() {
    describe("when the given amount is not greater than balance of the sender", function() {
      context("for a zero amount", function() {
        shouldBurn(new BN(0));
      });

      context("for a non-zero amount", function() {
        shouldBurn(new BN(100));
      });

      function shouldBurn(amount) {
        beforeEach(async function() {
          ({ logs: this.logs } = await this.token.burn(amount, {
            from: owner
          }));
        });

        it("burns the requested amount", async function() {
          expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(
            initialBalance.sub(amount)
          );
        });

        it("emits a transfer event", async function() {
          expectEvent.inLogs(this.logs, "Transfer", {
            from: owner,
            to: ZERO_ADDRESS,
            value: amount
          });
        });
      }
    });

    describe("when the given amount is greater than the balance of the sender", function() {
      const amount = initialBalance.addn(1);

      it("reverts", async function() {
        await expectRevert(
          this.token.burn(amount, { from: owner }),
          "ERC20: burn amount exceeds balance"
        );
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC20Burnable
};
