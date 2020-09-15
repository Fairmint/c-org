const BigNumber = require("bignumber.js");
const vestingArtifact = artifacts.require("TokenVesting");
const { constants } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { time } = require("@openzeppelin/test-helpers");

module.exports = function (control, beneficiary, investors, nonTokenHolder) {
  describe("Behavior / Wiki / Init / buy", () => {
    const initGoal = "10000000000000000000000";
    const initReserve = "1000000000000000000000";

    it("Sanity check: state is init", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.INIT);
    });

    describe("every investors[0] receives tokens for the same price until init_goal is reached", function () {
      beforeEach(async function () {
        // Purchase with multiple accounts
        for (let i = 0; i < investors.length; i++) {
          await this.contract.buy(investors[i], "100000000000000000000", 1, {
            from: investors[i],
            value: "100000000000000000000",
          });
        }
      });

      it("Sanity check: investors received FAIR tokens", async function () {
        const balance = await this.contract.balanceOf(investors[0]);
        assert.notEqual(balance.toString(), 0);
      });

      it("every investors[0] has the same number of tokens for their equal investment", async function () {
        const expectedBalance = await this.contract.balanceOf(investors[0]);
        for (let i = 1; i < investors.length; i++) {
          const accountBalance = await this.contract.balanceOf(investors[i]);
          assert.equal(expectedBalance.toString(), accountBalance.toString());
        }
      });
    });

    describe("beneficiary is the only one allowed to transfer()", function () {
      it("Sanity check: state is still init", async function () {
        const state = await this.contract.state();
        assert.equal(state.toString(), constants.STATE.INIT);
      });

      describe("beneficiary can transfer to another account", function () {
        it("Sanity check: targetAddress does not have any tokens yet", async function () {
          const balance = await this.contract.balanceOf(nonTokenHolder);
          assert.equal(balance.toString(), 0);
        });

        it("Sanity check: beneficiary balance == initReserve", async function () {
          const balance = await this.contract.balanceOf(beneficiary);
          assert.equal(balance.toString(), initReserve);
        });

        describe("transfer", function () {
          const transferAmount = "42";
          beforeEach(async function () {
            await this.contract.transfer(nonTokenHolder, transferAmount, {
              from: beneficiary,
            });
          });

          it("beneficiary balance went down", async function () {
            const balance = await this.contract.balanceOf(beneficiary);
            assert.equal(
              balance.toString(),
              new BigNumber(initReserve).minus(transferAmount).toFixed()
            );
          });

          it("target account balance went up", async function () {
            const balance = await this.contract.balanceOf(nonTokenHolder);
            assert.equal(balance.toString(), transferAmount);
          });
        });
      });

      it("beneficiary can transfer to a vesting contract", async function () {
        const currentTime = new BigNumber(await time.latest());
        const vesting = await vestingArtifact.new(
          beneficiary,
          currentTime.plus(100).toFixed(), // startDate is seconds
          120, // cliffDuration in seconds
          200, // duration in seconds
          false, // non-revocable
          {
            from: control,
          }
        );

        await this.whitelist.approveNewUsers([vesting.address], [4], {
          from: await this.contract.control(),
        });
        await this.contract.transfer(vesting.address, "42", {
          from: beneficiary,
        });
      });

      describe("other accounts cannot transfer", function () {
        beforeEach(async function () {
          await this.contract.buy(investors[0], "100000000000000000000", 1, {
            from: investors[0],
            value: "100000000000000000000",
          });
        });

        it("Sanity check: state is still init", async function () {
          const state = await this.contract.state();
          assert.equal(state.toString(), constants.STATE.INIT);
        });

        it("Sanity check: from account has FAIR tokens", async function () {
          const balance = await this.contract.balanceOf(investors[0]);
          assert.notEqual(balance.toString(), 0);
          assert(balance.gt(42));
        });

        it("transfer shouldFail", async function () {
          await expectRevert(
            this.contract.transfer(nonTokenHolder, 42, { from: investors[0] }),
            "ONLY_BENEFICIARY_DURING_INIT"
          );
        });
      });
    });

    describe("If amount > (buy_slope*init_goal^2) then the function exits", function () {
      let max;

      beforeEach(async function () {
        const buySlope = new BigNumber(await this.contract.buySlopeNum()).div(
          await this.contract.buySlopeDen()
        );
        max = buySlope.times(initGoal).times(initGoal).dp(0);
      });

      it("Sanity check: buy works if amount is less than max", async function () {
        await this.contract.buy(nonTokenHolder, "100000000000000000000", 1, {
          from: nonTokenHolder,
          value: "100000000000000000000",
        });
      });

      it("buy works if amount is exactly max", async function () {
        await this.contract.buy(nonTokenHolder, max.toFixed(), 1, {
          from: nonTokenHolder,
          value: max.toFixed(),
        });
      });

      describe("buy works if amount is exactly max even if many tokens were previously bought", function () {
        beforeEach(async function () {
          await this.contract.buy(nonTokenHolder, "100000000000000000000", 1, {
            from: nonTokenHolder,
            value: "100000000000000000000",
          });
        });

        it("buy for max still works", async function () {
          await this.contract.buy(nonTokenHolder, max.toFixed(), 1, {
            from: nonTokenHolder,
            value: max.toFixed(),
          });
        });
      });

      it("buy does not fail when amount is large", async function () {
        await this.contract.buy(
          nonTokenHolder,
          max.plus(100000000000).toFixed(),
          1,
          {
            from: nonTokenHolder,
            value: max.plus(100000000000).toFixed(),
          }
        );
      });
    });

    describe("If investors[0] is not allowed to buy FAIR, then the function exits.", function () {
      beforeEach(async function () {
        await this.whitelist.updateJurisdictionsForUserIds(
          [investors[0]],
          [-1],
          {
            from: await this.contract.control(),
          }
        );
      });

      it("Buy fails", async function () {
        await expectRevert(
          this.contract.buy(investors[0], "100000000000000000000", 1, {
            from: investors[0],
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
        this.contract.buy(investors[0], amount.toFixed(), 1, {
          from: investors[0],
          value: amount.toFixed(),
        }),
        "PRICE_SLIPPAGE"
      );
    });

    describe("Add x to the investors[0]'s balance with x=amount/(buy_slope*init_goal)", function () {
      const amount = "100000000000000000000";
      let x;

      beforeEach(async function () {
        await this.contract.buy(nonTokenHolder, amount, 1, {
          from: nonTokenHolder,
          value: amount,
        });
        const buySlope = new BigNumber(await this.contract.buySlopeNum()).div(
          await this.contract.buySlopeDen()
        );
        x = new BigNumber(amount).div(buySlope.times(initGoal));
      });

      it("investor's balance went up by x", async function () {
        const balance = await this.contract.balanceOf(nonTokenHolder);
        assert.equal(balance.toString(), x.toFixed());
      });

      it("Increase total_supply with x new FAIRs", async function () {
        const totalSupply = await this.contract.totalSupply();
        assert.equal(totalSupply.toString(), x.plus(initReserve).toFixed());
      });

      it("Add amount to the buyback_reserve", async function () {
        const buybackReserve = await this.contract.buybackReserve();
        assert.equal(
          buybackReserve.toString(),
          new BigNumber(amount).toFixed()
        );
      });

      it("Save investor's total investment in init_investors[address]+=x", async function () {
        const balance = await this.contract.initInvestors(nonTokenHolder);
        assert.equal(balance.toString(), x.toFixed());
      });

      describe("purchase again", function () {
        beforeEach(async function () {
          await this.contract.buy(nonTokenHolder, amount, 1, {
            from: nonTokenHolder,
            value: amount,
          });
        });

        it("investors[0]'s balance went up by x * 2", async function () {
          const balance = await this.contract.balanceOf(nonTokenHolder);
          assert.equal(balance.toString(), x.times(2).toFixed());
        });

        it("Increase total_supply with x new FAIRs", async function () {
          const totalSupply = await this.contract.totalSupply();
          assert.equal(
            totalSupply.toString(),
            x.times(2).plus(initReserve).toFixed()
          );
        });

        it("Add amount to the buyback_reserve", async function () {
          const buybackReserve = await this.contract.buybackReserve();
          assert.equal(
            buybackReserve.toString(),
            new BigNumber(amount).times(2).toFixed()
          );
        });

        it("Save investors[0]'s total investment in init_investors[address]+=x", async function () {
          const balance = await this.contract.initInvestors(nonTokenHolder);
          assert.equal(balance.toString(), x.times(2).toFixed());
        });
      });
    });

    describe("If total_supply - init_reserve >= init_goal (no beneficiary investment)", function () {
      let buybackReserveBefore;
      let beneficiaryBalanceBefore;
      let feeCollectorBalanceBefore;
      let feePercent;
      let y;
      let investmentReserve;

      beforeEach(async function () {
        const buySlope = new BigNumber(await this.contract.buySlopeNum()).div(
          await this.contract.buySlopeDen()
        );
        beneficiaryBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        feeCollectorBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.feeCollector())
        );
        investmentReserve = new BigNumber(
          await this.contract.investmentReserveBasisPoints()
        ).div(constants.BASIS_POINTS_DEN);
        feePercent = new BigNumber(await this.contract.feeBasisPoints()).div(
          constants.BASIS_POINTS_DEN
        );
        buybackReserveBefore = new BigNumber(
          await this.contract.buybackReserve()
        );

        const max = buySlope.times(initGoal).times(initGoal).div(2).dp(0);
        for (let i = 0; i < 2; i++) {
          await this.contract.buy(investors[0], max.toFixed(), 1, {
            from: investors[0],
            value: max.toFixed(),
          });
        }
        // y=init_investors[beneficiary]*buy_slope*init_goal
        y = new BigNumber(
          await this.contract.initInvestors(await this.contract.beneficiary())
        )
          .times(buySlope)
          .times(initGoal);
        buybackReserveBefore = max.times(2);
      });

      it("y == 0", async function () {
        assert.equal(y.toFixed(), 0);
      });

      it("fee != 0", async function () {
        assert.notEqual(feePercent.toFixed(), 0);
      });

      it("state=run", async function () {
        const state = await this.contract.state();
        assert.equal(state.toString(), constants.STATE.RUN);
      });

      it("send (buyback_reserve-y)*(1-investment_reserve)*(1-fee) to the beneficiary", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        const expected = buybackReserveBefore
          .minus(y)
          .times(new BigNumber(1).minus(investmentReserve))
          .times(new BigNumber(1).minus(feePercent))
          .plus(beneficiaryBalanceBefore);
        assert.equal(balance.toFixed(), expected.toFixed());
      });

      it("send (buyback_reserve-y)*(1-investment_reserve)*fee to the fee_collector", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.feeCollector())
        );
        const expected = buybackReserveBefore
          .minus(y)
          .times(new BigNumber(1).minus(investmentReserve))
          .times(feePercent)
          .plus(feeCollectorBalanceBefore);
        assert.equal(balance.toFixed(), expected.toFixed());
      });

      it("update buyback_reserve = investment_reserve * (buyback_reserve-y) + y", async function () {
        const buybackReserve = new BigNumber(
          await this.contract.buybackReserve()
        );
        const expected = investmentReserve.times(buybackReserveBefore.minus(y));
        assert.equal(buybackReserve.toFixed(), expected.toFixed());
      });
    });

    describe("If total_supply - init_reserve >= init_goal (with an beneficiary investment)", function () {
      let buybackReserveBefore;
      let beneficiaryBalanceBefore;
      let feeCollectorBalanceBefore;
      let fee;
      let y;
      let investmentReserve;

      beforeEach(async function () {
        const buySlope = new BigNumber(await this.contract.buySlopeNum()).div(
          await this.contract.buySlopeDen()
        );
        feeCollectorBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.feeCollector())
        );
        investmentReserve = new BigNumber(
          await this.contract.investmentReserveBasisPoints()
        ).div(constants.BASIS_POINTS_DEN);
        fee = new BigNumber(await this.contract.feeBasisPoints()).div(
          constants.BASIS_POINTS_DEN
        );

        const max = buySlope.times(initGoal).times(initGoal).div(2).dp(0);
        await this.contract.buy(beneficiary, max.toFixed(), 1, {
          from: beneficiary,
          value: max.toFixed(),
        });
        beneficiaryBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        await this.contract.buy(investors[0], max.toFixed(), 1, {
          from: investors[0],
          value: max.toFixed(),
        });
        // y=init_investors[beneficiary]*buy_slope*init_goal
        y = new BigNumber(
          await this.contract.initInvestors(await this.contract.beneficiary())
        )
          .times(buySlope)
          .times(initGoal);
        buybackReserveBefore = max.times(2);
      });

      it("y > 0", async function () {
        assert.notEqual(y.toFixed(), 0);
      });

      it("fee != 0", async function () {
        assert.notEqual(fee.toFixed(), 0);
      });

      it("state=run", async function () {
        const state = await this.contract.state();
        assert.equal(state.toString(), constants.STATE.RUN);
      });

      it("send (buyback_reserve-y)*(1-investment_reserve)*(1-fee) to the beneficiary", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        const expected = buybackReserveBefore
          .minus(y)
          .times(new BigNumber(1).minus(investmentReserve))
          .times(new BigNumber(1).minus(fee))
          .plus(beneficiaryBalanceBefore);
        assert.equal(balance.toFixed(), expected.toFixed());
      });

      it("send (buyback_reserve-y)*(1-investment_reserve)*fee to the fee_collector", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.feeCollector())
        );
        const expected = buybackReserveBefore
          .minus(y)
          .times(new BigNumber(1).minus(investmentReserve))
          .times(fee)
          .plus(feeCollectorBalanceBefore);
        assert.equal(balance.toFixed(), expected.toFixed());
      });

      it("update buyback_reserve = investment_reserve * (buyback_reserve-y) + y", async function () {
        const buybackReserve = new BigNumber(
          await this.contract.buybackReserve()
        );
        const expected = buybackReserveBefore
          .minus(y)
          .times(investmentReserve)
          .plus(y);
        assert.equal(buybackReserve.toFixed(), expected.toFixed());
      });
    });

    it("shouldFail if minTokens == 0", async function () {
      await expectRevert(
        this.contract.buy(investors[0], "100000000000000000000", 0, {
          from: investors[0],
          value: "100000000000000000000",
        }),
        "MUST_BUY_AT_LEAST_1"
      );
    });
  });
};
