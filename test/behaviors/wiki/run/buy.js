const BigNumber = require("bignumber.js");
const { constants } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (investor) {
  describe("Behavior / Wiki / Run / buy", () => {
    it("state is run", async function () {
      const state = await this.contract.state();
      assert.equal(state, constants.STATE.RUN);
    });

    describe("If investor is not allowed to buy FAIR, then the function exits.", function () {
      beforeEach(async function () {
        await this.whitelist.updateJurisdictionsForUserIds([investor], [-1], {
          from: await this.contract.control(),
        });
      });

      it("Buy fails", async function () {
        await expectRevert(
          this.contract.buy(investor, "100000000000000000000", 1, {
            from: investor,
            value: "100000000000000000000",
          }),
          "DENIED: JURISDICTION_FLOW"
        );
      });
    });

    it("If amount < min_investment, then the function exits.", async function () {
      const amount = new BigNumber(await this.contract.minInvestment()).minus(
        1
      );
      await expectRevert(
        this.contract.buy(investor, amount.toFixed(), 1, {
          from: investor,
          value: amount.toFixed(),
        }),
        "PRICE_SLIPPAGE"
      );
    });

    // x=sqrt((2*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)

    describe("If x < minimum then the call fails.", function () {
      const amount = "100000000000000000000";
      let x;

      beforeEach(async function () {
        x = new BigNumber(await this.contract.estimateBuyValue(amount));
      });

      it("buying with min+1 should fail", async function () {
        await expectRevert(
          this.contract.buy(investor, amount, x.plus(1).toFixed(), {
            from: investor,
            value: amount,
          }),
          "PRICE_SLIPPAGE"
        );
      });

      it("Sanity check buying x works", async function () {
        await this.contract.buy(investor, amount, x.toFixed(), {
          from: investor,
          value: amount,
        });
      });
    });

    describe("Mint x tokens.", function () {
      const amount = "100000000000000000000";
      let balanceBefore;
      let totalSupplyBefore;
      let x;

      beforeEach(async function () {
        balanceBefore = new BigNumber(await this.contract.balanceOf(investor));
        totalSupplyBefore = new BigNumber(await this.contract.totalSupply());
        x = new BigNumber(await this.contract.estimateBuyValue(amount));
        await this.contract.buy(investor, amount, 1, {
          from: investor,
          value: amount,
        });
      });

      it("Add x FAIRs to the investor's balance.", async function () {
        const balance = new BigNumber(await this.contract.balanceOf(investor));
        assert.equal(balance.toFixed(), balanceBefore.plus(x).toFixed());
      });

      it("Increase total_supply with x new FAIRs.", async function () {
        const totalSupply = new BigNumber(await this.contract.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.plus(x).toFixed()
        );
      });

      describe("Mint more tokens", function () {
        beforeEach(async function () {
          balanceBefore = new BigNumber(
            await this.contract.balanceOf(investor)
          );
          totalSupplyBefore = new BigNumber(await this.contract.totalSupply());
          x = new BigNumber(await this.contract.estimateBuyValue(amount));
          await this.contract.buy(investor, amount, 1, {
            from: investor,
            value: amount,
          });
        });

        it("Add x FAIRs to the investor's balance.", async function () {
          const balance = new BigNumber(
            await this.contract.balanceOf(investor)
          );
          assert.equal(balance.toFixed(), balanceBefore.plus(x).toFixed());
        });

        it("Increase total_supply with x new FAIRs.", async function () {
          const totalSupply = new BigNumber(await this.contract.totalSupply());
          assert.equal(
            totalSupply.toFixed(),
            totalSupplyBefore.plus(x).toFixed()
          );
        });
      });
    });

    describe("If the investor is the beneficiary", function () {
      const amount = "100000000000000000000";
      let from;
      let burnBefore;
      let buybackReserveBefore;

      beforeEach(async function () {
        from = await this.contract.beneficiary();
      });

      describe("if (x+investor_balance)/(total_supply+burnt_supply) >= burn_threshold", function () {
        beforeEach(async function () {
          burnBefore = new BigNumber(await this.contract.burnedSupply());
          buybackReserveBefore = new BigNumber(
            await this.contract.buybackReserve()
          );

          await this.contract.buy(from, amount, 1, {
            from,
            value: amount,
          });
        });

        it("Sanity check: state is run", async function () {
          const state = await this.contract.state();
          assert.equal(state, constants.STATE.RUN);
        });

        it("no additional tokens are burned", async function () {
          const burned = new BigNumber(
            await this.contract.burnedSupply()
          ).minus(burnBefore);
          assert.equal(burned, 0);
        });

        it("the full amount is added to the buyback_reserve", async function () {
          const buybackReserve = new BigNumber(
            await this.contract.buybackReserve()
          );
          assert.equal(
            buybackReserve.toFixed(),
            buybackReserveBefore.plus(amount).toFixed()
          );
        });
      });
    });

    describe("If the investor is not the beneficiary", function () {
      let beneficiary;
      let feeCollector;
      const amount = "100000000000000000000";
      let investmentReserve, fee;
      let buybackReserveBefore, beneficiaryBefore, feeCollectorBefore;

      beforeEach(async function () {
        if (this.contract.investmentReserveBasisPoints) {
          investmentReserve = new BigNumber(
            await this.contract.investmentReserveBasisPoints()
          ).div(constants.BASIS_POINTS_DEN);
        } else {
          investmentReserve = new BigNumber("0");
        }

        fee = new BigNumber(await this.contract.feeBasisPoints()).div(
          constants.BASIS_POINTS_DEN
        );
        buybackReserveBefore = new BigNumber(
          await this.contract.buybackReserve()
        );
        beneficiary = await this.contract.beneficiary();
        beneficiaryBefore = new BigNumber(
          await web3.eth.getBalance(beneficiary)
        );
        feeCollector = await this.contract.feeCollector();
        feeCollectorBefore = new BigNumber(
          await web3.eth.getBalance(feeCollector)
        );

        await this.contract.buy(investor, amount, 1, {
          from: investor,
          value: amount,
        });
      });

      it("investment_reserve*amount is being added to the buyback_reserve", async function () {
        const buybackReserve = new BigNumber(
          await this.contract.buybackReserve()
        );
        const delta = investmentReserve.times(amount);
        assert.equal(
          buybackReserve.toFixed(),
          buybackReserveBefore.plus(delta).toFixed()
        );
        assert(delta.gt(0));
      });

      it("(1-investment_reserve)*amount*(1-fee) is being transfered to beneficiary", async function () {
        const balance = new BigNumber(await web3.eth.getBalance(beneficiary));

        const delta = new BigNumber(1)
          .minus(investmentReserve)
          .times(amount)
          .times(new BigNumber(1).minus(fee));
        assert.equal(
          balance.toFixed(),
          beneficiaryBefore.plus(delta).toFixed()
        );
        assert(delta.gt(0));
      });

      it("(1-investment_reserve)*amount*fee is being sent to fee_collector", async function () {
        const balance = new BigNumber(await web3.eth.getBalance(feeCollector));
        const delta = new BigNumber(1)
          .minus(investmentReserve)
          .times(amount)
          .times(fee);
        assert.equal(
          balance.toFixed(),
          feeCollectorBefore.plus(delta).toFixed()
        );
        assert(delta.gt(0));
      });
    });
  });
};
