// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

/**
 * Requires `this.contract`
 */
module.exports = function () {
  describe("Behavior / ERC20 / name", function () {
    it("has a name", async function () {
      assert.notEqual(await this.contract.name(), "");
    });
  });
};
