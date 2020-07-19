// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

/**
 * Requires `this.contract`
 */
module.exports = function () {
  describe("Behavior / ERC20 / symbol", function () {
    it("has a symbol", async function () {
      assert.notEqual(await this.contract.symbol(), "");
    });
  });
};
