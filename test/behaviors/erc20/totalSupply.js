const BigNumber = require("bignumber.js");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner) {
  describe("Behavior / ERC20 / TotalSupply", function () {
    let initialBalance;

    beforeEach(async function () {
      initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
    });

    it("defaults to token holder's balance", async function () {
      assert.equal(
        (await this.contract.totalSupply()).toString(),
        initialBalance.toFixed()
      );
    });
  });
};
