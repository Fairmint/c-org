const BigNumber = require("bignumber.js");
const { constants, getGasCost } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (beneficiary, investor) {
  describe("Behavior / Wiki / Init / sell", () => {
    const initReserve = "1000000000000000000000";
    const sellAmount = "1000000000000000000";

    beforeEach(async function () {
      await this.contract.buy(investor, "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: investor,
      });
    });

    it("Sanity check: state is init", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.INIT);
    });

    it("If address == beneficiary, then the function exits.", async function () {
      await expectRevert(
        this.contract.sell(beneficiary, sellAmount, 1, { from: beneficiary }),
        "BENEFICIARY_ONLY_SELL_IN_CLOSE_OR_CANCEL"
      );
    });

    describe("if the investor was awarded tokens from the initReserve", function () {
      beforeEach(async function () {
        await this.contract.transfer(investor, initReserve, {
          from: beneficiary,
        });
      });

      it("If init_investors[address]<amount then the call fails.", async function () {
        await expectRevert(
          this.contract.sell(investor, initReserve, 1, { from: investor }),
          "SafeMath: subtraction overflow"
        );
      });

      it("The call works if amount==init_investors[address]", async function () {
        const initInvestment = await this.contract.initInvestors(investor);
        await this.contract.sell(investor, initInvestment, 1, {
          from: investor,
        });
        assert.notEqual(initInvestment.toString(), 0);
        assert.equal(
          (await this.contract.initInvestors(investor)).toString(),
          0
        );
      });
    });

    describe("On a successful sell", function () {
      let investorFairBalanceBefore;
      let investorCurrencyBalanceBefore;
      let initInvestmentBefore;
      let totalSupplyBefore;
      let x;
      let gasCost;

      beforeEach(async function () {
        investorFairBalanceBefore = new BigNumber(
          await this.contract.balanceOf(investor)
        );
        investorCurrencyBalanceBefore = new BigNumber(
          await web3.eth.getBalance(investor)
        );
        initInvestmentBefore = new BigNumber(
          await this.contract.initInvestors(investor)
        );
        totalSupplyBefore = new BigNumber(await this.contract.totalSupply());

        // x=amount*buyback_reserve/(total_supply-init_reserve)
        x = new BigNumber(await this.contract.estimateSellValue(sellAmount));

        const tx = await this.contract.sell(investor, sellAmount, 1, {
          from: investor,
        });
        gasCost = await getGasCost(tx);
      });

      it("amount is being substracted from the investor's balance.", async function () {
        const balance = new BigNumber(await this.contract.balanceOf(investor));
        assert.equal(
          balance.toFixed(),
          investorFairBalanceBefore.minus(sellAmount).toFixed()
        );
      });

      it("The investor receives x collateral value from the buyback_reserve.", async function () {
        const balance = new BigNumber(await web3.eth.getBalance(investor));
        assert.equal(
          balance.toFixed(),
          investorCurrencyBalanceBefore.plus(x).minus(gasCost).toFixed()
        );
        assert.notEqual(x.toFixed(), 0);
      });

      it("Save investor's total withdrawal in init_investors[address]-=amount.", async function () {
        const initInvestment = new BigNumber(
          await this.contract.initInvestors(investor)
        );
        assert.equal(
          initInvestment.toFixed(),
          initInvestmentBefore.minus(sellAmount).toFixed()
        );
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
        this.contract.sell(investor, sellAmount, x.plus(1).toFixed(), {
          from: investor,
        }),
        "PRICE_SLIPPAGE"
      );
    });

    it("If the min is exact, the call works", async function () {
      // x=amount*buyback_reserve/(total_supply-init_reserve)
      const x = new BigNumber(
        await this.contract.estimateSellValue(sellAmount)
      );

      await this.contract.sell(investor, sellAmount, x.toFixed(), {
        from: investor,
      });
    });

    it("shouldFail if minCurrency == 0", async function () {
      await expectRevert(
        this.contract.sell(investor, sellAmount, 0, { from: investor }),
        "MUST_SELL_AT_LEAST_1"
      );
    });
  });
};
