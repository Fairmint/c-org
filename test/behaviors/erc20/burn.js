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
  describe("Behavior / ERC20 / burn", function () {
    let initialBalance;

    beforeEach(async function () {
      initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
    });

    it("sanity check: balance >= 100", async function () {
      const actual = new BigNumber(await this.contract.balanceOf(tokenOwner));
      assert(actual.isGreaterThanOrEqualTo("100"));
    });

    describe("when the given amount is not greater than balance of the sender", function () {
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

    describe("when the given amount is greater than the balance of the sender", function () {
      it("reverts", async function () {
        const amount = initialBalance.plus(1);
        await expectRevert(
          this.contract.burn(amount.toFixed(), { from: tokenOwner }),
          "ERC20: burn amount exceeds balance"
        );
      });
    });

    describe("_burn", function () {
      describe("for a non zero account", function () {
        it("rejects burning more than balance", async function () {
          await expectRevert(
            this.contract.burn(initialBalance.plus(1).toFixed(), {
              from: tokenOwner,
            }),
            "ERC20: burn amount exceeds balance"
          );
        });

        const describeBurn = function (description, delta) {
          let amount;

          beforeEach(async function () {
            amount = initialBalance.minus(delta);
          });

          describe(description, function () {
            beforeEach("burning", async function () {
              const { logs } = await this.contract.burn(amount.toFixed(), {
                from: tokenOwner,
              });
              this.logs = logs;
            });

            it("decrements totalSupply", async function () {
              const expectedSupply = initialBalance.minus(amount);
              assert.equal(
                (await this.contract.totalSupply()).toString(),
                expectedSupply.toFixed()
              );
            });

            it("decrements initialHolder balance", async function () {
              const expectedBalance = initialBalance.minus(amount);
              assert.equal(
                (await this.contract.balanceOf(tokenOwner)).toString(),
                expectedBalance.toFixed()
              );
            });

            it("emits Transfer event", async function () {
              const event = expectEvent.inLogs(this.logs, "Transfer", {
                from: tokenOwner,
                to: constants.ZERO_ADDRESS,
              });

              assert.equal(event.args.value.toString(), amount.toFixed());
            });
          });
        };

        describeBurn("for entire balance", 0);
        describeBurn("for less amount than balance", 1);
      });
    });
  });
};
