const BigNumber = require("bignumber.js");

module.exports = function () {
  describe("Behavior / Wiki / Run / closeWithHighReserve", () => {
    describe("when reserve is high", function () {
      it("exitFee is 0", async function () {
        const exitFee = new BigNumber(await this.contract.estimateExitFee(0));
        assert.equal(exitFee, 0);
      });
    });
  });
};
