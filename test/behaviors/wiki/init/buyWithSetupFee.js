const BigNumber = require("bignumber.js");
const { constants } = require("../../../helpers");

module.exports = function (beneficiary, investor, setupFeeRecipient) {
  describe("Behavior / Wiki / Init / buyWithSetupFee", () => {
    const initGoal = "10000000000000000000000";
    const setupFee = "420000000";

    it("Sanity check: state is init", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.INIT);
    });

    it("setupFee was set", async function () {
      const _setupFee = await this.contract.setupFee();
      assert.equal(_setupFee.toString(), setupFee);
    });

    it("setupFeeRecipient was set", async function () {
      const _setupFeeRecipient = await this.contract.setupFeeRecipient();
      assert.equal(_setupFeeRecipient, setupFeeRecipient);
    });

    describe("If total_supply - init_reserve >= init_goal (no beneficiary investment)", function () {
      let buybackReserveBefore;
      let beneficiaryBalanceBefore;
      let feeCollectorBalanceBefore;
      let setupFeeRecipientBalanceBefore;
      let fee;
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
        setupFeeRecipientBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.setupFeeRecipient())
        );
        investmentReserve = new BigNumber(
          await this.contract.investmentReserveBasisPoints()
        ).div(constants.BASIS_POINTS_DEN);
        fee = new BigNumber(await this.contract.feeBasisPoints()).div(
          constants.BASIS_POINTS_DEN
        );

        const max = buySlope.times(initGoal).times(initGoal).dp(0);
        for (let i = 0; i < 2; i++) {
          await this.contract.buy(investor, max.toFixed(), 1, {
            from: investor,
            value: max.toFixed(),
          });
        }
        // y=init_investors[beneficiary]*buy_slope*init_goal
        y = new BigNumber(
          await this.contract.initInvestors(await this.contract.beneficiary())
        )
          .times(buySlope)
          .times(initGoal);
        if (y.gt(setupFee)) {
          y = y.minus(setupFee);
        } else {
          y = 0;
        }
        buybackReserveBefore = max.times(2).minus(setupFee);
      });

      it("y == 0", async function () {
        assert.equal(y.toFixed(), 0);
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

      it("send setupFee to the setupFeeRecipient", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.setupFeeRecipient())
        );
        const expected = setupFeeRecipientBalanceBefore.plus(setupFee);
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

      it("update buyback_reserve = investment_reserve * (buyback_reserve-y) + y - setupFee", async function () {
        const buybackReserve = new BigNumber(
          await this.contract.buybackReserve()
        );
        const expected = investmentReserve
          .times(buybackReserveBefore.minus(y))
          .plus(y);
        assert.equal(buybackReserve.toFixed(), expected.toFixed());
      });
    });

    describe("If total_supply - init_reserve >= init_goal (with an beneficiary investment)", function () {
      let buybackReserveBefore;
      let beneficiaryBalanceBefore;
      let feeCollectorBalanceBefore;
      let setupFeeRecipientBalanceBefore;
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
        setupFeeRecipientBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.setupFeeRecipient())
        );
        investmentReserve = new BigNumber(
          await this.contract.investmentReserveBasisPoints()
        ).div(constants.BASIS_POINTS_DEN);
        fee = new BigNumber(await this.contract.feeBasisPoints()).div(
          constants.BASIS_POINTS_DEN
        );

        const max = buySlope.times(initGoal).times(initGoal).dp(0);
        await this.contract.buy(beneficiary, max.toFixed(), 1, {
          from: beneficiary,
          value: max.toFixed(),
        });
        beneficiaryBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        await this.contract.buy(investor, max.toFixed(), 1, {
          from: investor,
          value: max.toFixed(),
        });
        // y=init_investors[beneficiary]*buy_slope*init_goal
        y = new BigNumber(
          await this.contract.initInvestors(await this.contract.beneficiary())
        )
          .times(buySlope)
          .times(initGoal);
        if (y.gt(setupFee)) {
          y = y.minus(setupFee);
        } else {
          y = 0;
        }
        buybackReserveBefore = max.times(2).minus(setupFee);
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

      it("send setupFee to the setupFeeRecipient", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.setupFeeRecipient())
        );
        const expected = setupFeeRecipientBalanceBefore.plus(setupFee);
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
  });
};
