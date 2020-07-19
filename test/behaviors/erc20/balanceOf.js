// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

/**
 * Requires `this.contract`
 */
module.exports = (tokenOwner, nonTokenHolder) => {
  describe("Behavior / ERC20 / balanceOf", function () {
    describe("when the requested account has no tokens", function () {
      it("returns zero", async function () {
        assert.equal(
          (await this.contract.balanceOf(nonTokenHolder)).toString(),
          "0"
        );
      });
    });

    describe("when the requested account has some tokens", function () {
      it("returns the total amount of tokens", async function () {
        assert.notEqual(
          (await this.contract.balanceOf(tokenOwner)).toString(),
          "0"
        );
      });
    });
  });
};
