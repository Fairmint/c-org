const BigNumber = require("bignumber.js");
const {
  expectEvent,
  expectRevert,
  constants,
} = require("@openzeppelin/test-helpers");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner, nonTokenHolder) {
  describe("Behavior / ERC20 / transfer", function () {
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

    describe("when the recipient is not the zero address", function () {
      describe("when the sender does not have enough balance", function () {
        let amount;

        beforeEach(async function () {
          amount = initialBalance.plus(1);
        });

        it("reverts", async function () {
          await expectRevert(
            this.contract.transfer(nonTokenHolder, amount.toFixed(), {
              from: tokenOwner,
            }),
            "INSUFFICIENT_BALANCE"
          );
        });
      });

      describe("when the sender transfers all balance", function () {
        it("transfers the requested amount", async function () {
          await this.contract.transfer(
            nonTokenHolder,
            initialBalance.toFixed(),
            {
              from: tokenOwner,
            }
          );

          assert.equal(
            (await this.contract.balanceOf(tokenOwner)).toString(),
            "0"
          );

          assert.equal(
            (await this.contract.balanceOf(nonTokenHolder)).toString(),
            initialBalance.toFixed()
          );
        });

        it("emits a transfer event", async function () {
          const { logs } = await this.contract.transfer(
            nonTokenHolder,
            initialBalance.toFixed(),
            { from: tokenOwner }
          );

          expectEvent.inLogs(logs, "Transfer", {
            from: tokenOwner,
            to: nonTokenHolder,
            value: initialBalance.toFixed(),
          });
        });
      });

      describe("when the sender transfers zero tokens", function () {
        it("transfers the requested amount", async function () {
          await this.contract.transfer(nonTokenHolder, "0", {
            from: tokenOwner,
          });

          assert.equal(
            (await this.contract.balanceOf(tokenOwner)).toString(),
            initialBalance.toFixed()
          );

          assert.equal(
            (await this.contract.balanceOf(nonTokenHolder)).toString(),
            "0"
          );
        });

        it("emits a transfer event", async function () {
          const { logs } = await this.contract.transfer(nonTokenHolder, "0", {
            from: tokenOwner,
          });

          expectEvent.inLogs(logs, "Transfer", {
            from: tokenOwner,
            to: nonTokenHolder,
            value: "0",
          });
        });
      });
    });

    describe("when the recipient is the zero address", function () {
      it("reverts", async function () {
        await expectRevert(
          this.contract.transfer(
            constants.ZERO_ADDRESS,
            initialBalance.toFixed(),
            { from: tokenOwner }
          ),
          `ERC20: transfer to the zero address`
        );
      });
    });
  });
};
