const BigNumber = require("bignumber.js");
const { constants } = require("../../../helpers");

module.exports = function (investor) {
  describe("Behavior / Wiki / Run / burn", () => {
    const burnAmount = "42";

    it("Sanity check: state is run", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.RUN);
    });

    describe("on burn", function () {
      let investorBalanceBefore, burnedSupplyBefore, totalSupplyBefore;

      beforeEach(async function () {
        burnedSupplyBefore = new BigNumber(await this.contract.burnedSupply());
        investorBalanceBefore = new BigNumber(
          await this.contract.balanceOf(investor)
        );
        totalSupplyBefore = new BigNumber(await this.contract.totalSupply());
        await this.contract.burn(burnAmount, {
          from: investor,
        });
      });

      it("The burn amount was added to burnedSupply", async function () {
        const burnedSupply = new BigNumber(await this.contract.burnedSupply());
        assert.equal(
          burnedSupply.toFixed(),
          burnedSupplyBefore.plus(burnAmount).toFixed()
        );
      });

      it("The burn amount was deducted from totalSupply", async function () {
        const totalSupply = new BigNumber(await this.contract.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.minus(burnAmount).toFixed()
        );
      });

      it("The investor balance went down", async function () {
        const balance = new BigNumber(await this.contract.balanceOf(investor));
        assert.equal(
          balance.toFixed(),
          investorBalanceBefore.minus(burnAmount).toFixed()
        );
      });

      describe("Sanity check: burn again", function () {
        let investorBalanceBefore, burnedSupplyBefore, totalSupplyBefore;

        beforeEach(async function () {
          burnedSupplyBefore = new BigNumber(
            await this.contract.burnedSupply()
          );
          investorBalanceBefore = new BigNumber(
            await this.contract.balanceOf(investor)
          );
          totalSupplyBefore = new BigNumber(await this.contract.totalSupply());
          await this.contract.burn(burnAmount, {
            from: investor,
          });
        });

        it("The burn amount was added to burnedSupply", async function () {
          const burnedSupply = new BigNumber(
            await this.contract.burnedSupply()
          );
          assert.equal(
            burnedSupply.toFixed(),
            burnedSupplyBefore.plus(burnAmount).toFixed()
          );
        });

        it("The burn amount was deducted from totalSupply", async function () {
          const totalSupply = new BigNumber(await this.contract.totalSupply());
          assert.equal(
            totalSupply.toFixed(),
            totalSupplyBefore.minus(burnAmount).toFixed()
          );
        });

        it("The investor balance went down", async function () {
          const balance = new BigNumber(
            await this.contract.balanceOf(investor)
          );
          assert.equal(
            balance.toFixed(),
            investorBalanceBefore.minus(burnAmount).toFixed()
          );
        });
      });
    });

    describe("If trades are restricted", function () {
      beforeEach(async function () {
        await this.whitelist.updateJurisdictionsForUserIds([investor], [-1], {
          from: await this.contract.control(),
        });
      });

      it("Can burn even if account is restricted", async function () {
        await this.contract.burn(burnAmount, {
          from: investor,
        });
      });
    });
  });
};
