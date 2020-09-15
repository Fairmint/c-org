const BigNumber = require("bignumber.js");
const { constants } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");
const ERC20 = artifacts.require("IERC20");

/**
 * Requires `this.contract`
 */
module.exports = function (beneficiary, investor, areTransactionsFrozen) {
  describe("Behavior / Wiki / Close / sell", function () {
    const sellAmount = "1000000000000000000";

    it("state is close", async function () {
      const state = await this.contract.state();
      assert.equal(state, constants.STATE.CLOSE);
    });

    if (!areTransactionsFrozen) {
      it("the beneficiary can sell", async function () {
        await this.contract.sell(beneficiary, sellAmount, 1, {
          from: beneficiary,
        });
      });

      describe("On a successful sell", function () {
        let investorFairBalanceBefore;
        let investorCurrencyBalanceBefore;
        let totalSupplyBefore;
        let x;
        let currency;

        beforeEach(async function () {
          currency = await ERC20.at(await this.contract.currency());
          investorFairBalanceBefore = new BigNumber(
            await this.contract.balanceOf(investor)
          );
          investorCurrencyBalanceBefore = new BigNumber(
            await currency.balanceOf(investor)
          );
          totalSupplyBefore = new BigNumber(await this.contract.totalSupply());

          x = new BigNumber(await this.contract.estimateSellValue(sellAmount));

          await this.contract.sell(investor, sellAmount, 1, {
            from: investor,
          });
        });

        it("amount is being subtracted from the investor's balance.", async function () {
          const balance = new BigNumber(
            await this.contract.balanceOf(investor)
          );
          assert.equal(
            balance.toFixed(),
            investorFairBalanceBefore.minus(sellAmount).toFixed()
          );
        });

        it("The investor receives x collateral value from the buyback_reserve.", async function () {
          const balance = new BigNumber(await currency.balanceOf(investor));
          assert.equal(
            balance.toFixed(),
            investorCurrencyBalanceBefore.plus(x).toFixed()
          );
          assert.notEqual(x.toFixed(), 0);
        });

        it("initInvestment does not change.", async function () {
          const initInvestment = new BigNumber(
            await this.contract.initInvestors(investor)
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
        const x = new BigNumber(
          await this.contract.estimateSellValue(sellAmount)
        );

        await this.contract.sell(investor, sellAmount, x.toFixed(), {
          from: investor,
        });
      });
    } else {
      it("shouldFail to sell", async function () {
        const x = new BigNumber(
          await this.contract.estimateSellValue(sellAmount)
        );

        await expectRevert(
          this.contract.sell(investor, sellAmount, x.toFixed(), {
            from: investor,
          }),
          "INVALID_STATE"
        );
      });
    }
  });
};
