const { time, expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function () {
  describe("Behavior / Wiki / Run / closeWithMinDuration", () => {
    describe("when locked", async function () {
      it("If now < minDuration then close fails", async function () {
        await expectRevert(
          this.contract.close({
            from: await this.contract.beneficiary(),
            value: "1000000000000000000000000",
          }),
          "TOO_EARLY"
        );
      });

      describe("after the lock expires", function () {
        beforeEach(async function () {
          await time.increase(11);
        });

        it("then close works again", async function () {
          await this.contract.close({
            from: await this.contract.beneficiary(),
            value: "1000000000000000000000000",
          });
        });
      });
    });
  });
};
