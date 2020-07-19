const BigNumber = require("bignumber.js");
const {
  expectRevert,
  constants,
  expectEvent,
} = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner, nonTokenHolder, operator) {
  describe("Behavior / ERC20 / _mint", function () {
    const value = "420000000000000000000";
    let amount;
    let initialBalance;

    beforeEach(async function () {
      initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
      amount = new BigNumber(await this.contract.estimateBuyValue(value));
    });

    it("rejects a null account", async function () {
      await expectRevert(
        this.contract.buy(constants.ZERO_ADDRESS, value, 1, {
          value,
          from: operator,
        }),
        "INVALID_ADDRESS"
      );
    });

    describe("for a non zero account", function () {
      beforeEach("minting", async function () {
        const { logs } = await this.contract.buy(nonTokenHolder, value, 1, {
          value,
          from: operator,
        });
        this.logs = logs;
      });

      it("increments totalSupply", async function () {
        const expectedSupply = initialBalance.plus(amount);
        assert.equal(
          (await this.contract.totalSupply()).toString(),
          expectedSupply.toFixed()
        );
      });

      it("increments recipient balance", async function () {
        assert.equal(
          (await this.contract.balanceOf(nonTokenHolder)).toString(),
          amount.toFixed()
        );
      });

      it("emits Transfer event", async function () {
        const event = expectEvent.inLogs(this.logs, "Transfer", {
          from: constants.ZERO_ADDRESS,
          to: nonTokenHolder,
        });

        assert.equal(event.args.value.toString(), amount.toFixed());
      });
    });
  });
};
