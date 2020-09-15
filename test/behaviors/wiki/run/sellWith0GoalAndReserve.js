const BigNumber = require("bignumber.js");
const { constants, getGasCost } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (beneficiary, investors) {
  describe("Behavior / Wiki / Run / sell", () => {
    const sellAmount = "1000000000000000000";

    it("state is run", async function () {
      const state = await this.contract.state();
      assert.equal(state, constants.STATE.RUN);
    });

    it("If address == beneficiary, then the function exits.", async function () {
      await expectRevert(
        this.contract.sell(beneficiary, sellAmount, 1, { from: beneficiary }),
        "BENEFICIARY_ONLY_SELL_IN_CLOSE_OR_CANCEL"
      );
    });

    it("If init_goal=0 && buyback_reserve=0, then the function exits.", async function () {
      await this.contract.transfer(investors[0], sellAmount, {
        from: beneficiary,
      });
      await expectRevert(
        this.contract.sell(investors[0], sellAmount, 1, { from: investors[0] }),
        "PRICE_SLIPPAGE"
      );
    });

    // x=(total_supply+burnt_supply)*amount*sell_slope-((sell_slope*amount^2)/2)+(sell_slope*amount*burnt_supply^2)/(2*(total_supply)) with sell_slope=(2*buyback_reserve)/((total_supply+burnt_supply)^2).

    it("If x < minimum then the call fails.", async function () {
      const x = new BigNumber(
        await this.contract.estimateSellValue(sellAmount)
      );

      await expectRevert(
        this.contract.sell(investors[0], sellAmount, x.plus(1).toFixed(), {
          from: investors[0],
        }),
        "PRICE_SLIPPAGE"
      );
    });

    describe("On a successful sell", function () {
      let investorFairBalanceBefore;
      let investorCurrencyBalanceBefore;
      let totalSupplyBefore;
      let x;
      let gasCost;

      beforeEach(async function () {
        investorFairBalanceBefore = new BigNumber(
          await this.contract.balanceOf(investors[0])
        );
        investorCurrencyBalanceBefore = new BigNumber(
          await web3.eth.getBalance(investors[0])
        );
        totalSupplyBefore = new BigNumber(await this.contract.totalSupply());

        // x=amount*buyback_reserve/(total_supply-init_reserve)
        x = new BigNumber(await this.contract.estimateSellValue(sellAmount));

        const tx = await this.contract.sell(investors[0], sellAmount, 1, {
          from: investors[0],
        });
        gasCost = await getGasCost(tx);
      });

      it("amount is being subtracted from the investors[0]'s balance.", async function () {
        const balance = new BigNumber(
          await this.contract.balanceOf(investors[0])
        );
        assert.equal(
          balance.toFixed(),
          investorFairBalanceBefore.minus(sellAmount).toFixed()
        );
      });

      it("The investors[0] receives x collateral value from the buyback_reserve.", async function () {
        const balance = new BigNumber(await web3.eth.getBalance(investors[0]));
        assert.equal(
          balance.toFixed(),
          investorCurrencyBalanceBefore.plus(x).minus(gasCost).toFixed()
        );
        assert.notEqual(x.toFixed(), 0);
      });

      it("initInvestment does not change.", async function () {
        const initInvestment = new BigNumber(
          await this.contract.initInvestors(investors[0])
        );
        assert.equal(initInvestment.toFixed(), 0);
      });

      it("The total_supply is decreased of amount FAIRs.", async function () {
        const totalSupply = new BigNumber(await this.contract.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.minus(sellAmount).toFixed()
        );
      });
    });

    it("if the value is less than the min specified then sell fails", async function () {
      // x=amount*buyback_reserve/(total_supply-init_reserve)
      const x = new BigNumber(
        await this.contract.estimateSellValue(sellAmount)
      );

      await expectRevert(
        this.contract.sell(investors[0], sellAmount, x.plus(1).toFixed(), {
          from: investors[0],
        }),
        "PRICE_SLIPPAGE"
      );
    });

    it("If the min is exact, the call works", async function () {
      // x=amount*buyback_reserve/(total_supply-init_reserve)
      const x = new BigNumber(
        await this.contract.estimateSellValue(sellAmount)
      );

      await this.contract.sell(investors[0], sellAmount, x.toFixed(), {
        from: investors[0],
      });
    });

    describe("If investors[0] is not authorized, then the function exits.", function () {
      beforeEach(async function () {
        await this.whitelist.updateJurisdictionsForUserIds(
          [investors[0]],
          [-1],
          {
            from: await this.contract.control(),
          }
        );
      });

      it("Sell fails", async function () {
        await expectRevert(
          this.contract.sell(investors[0], sellAmount, "1", {
            from: investors[0],
          }),
          "DENIED: JURISDICTION_FLOW"
        );
      });
    });
  });
};
