const BigNumber = require("bignumber.js");
const vestingArtifact = artifacts.require("TokenVesting");
const {
  approveAll,
  constants,
  deployDat,
  shouldFail,
} = require("../../helpers");

contract("wiki / buy / initWithSetupFee", (accounts) => {
  const initGoal = "10000000000000000000000";
  const initReserve = "1000000000000000000000";
  const setupFee = "420000000";
  const setupFeeRecipient = accounts[8];
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal,
      initReserve,
      feeBasisPoints: "10",
      setupFee,
      setupFeeRecipient,
    });

    await approveAll(contracts, accounts);
  });

  it("Sanity check: state is init", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.INIT);
  });

  it("setupFee was set", async () => {
    const _setupFee = await contracts.dat.setupFee();
    assert.equal(_setupFee.toString(), setupFee);
  });

  it("setupFeeRecipient was set", async () => {
    const _setupFeeRecipient = await contracts.dat.setupFeeRecipient();
    assert.equal(_setupFeeRecipient, setupFeeRecipient);
  });

  describe("If total_supply - init_reserve >= init_goal (no beneficiary investment)", () => {
    let buybackReserveBefore;
    let beneficiaryBalanceBefore;
    let feeCollectorBalanceBefore;
    let setupFeeRecipientBalanceBefore;
    let fee;
    let y;
    let investmentReserve;

    beforeEach(async () => {
      const buySlope = new BigNumber(await contracts.dat.buySlopeNum()).div(
        await contracts.dat.buySlopeDen()
      );
      beneficiaryBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      feeCollectorBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.feeCollector())
      );
      setupFeeRecipientBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.setupFeeRecipient())
      );
      investmentReserve = new BigNumber(
        await contracts.dat.investmentReserveBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);
      fee = new BigNumber(await contracts.dat.feeBasisPoints()).div(
        constants.BASIS_POINTS_DEN
      );

      const max = buySlope.times(initGoal).times(initGoal).div(2).dp(0);
      for (let i = 0; i < 2; i++) {
        await contracts.dat.buy(accounts[5], max.toFixed(), 1, {
          from: accounts[5],
          value: max.toFixed(),
        });
      }
      // y=init_investors[beneficiary]*buy_slope*init_goal/2
      y = new BigNumber(
        await contracts.dat.initInvestors(await contracts.dat.beneficiary())
      )
        .times(buySlope)
        .times(initGoal)
        .div(2);
      if (y.gt(setupFee)) {
        y = y.minus(setupFee);
      } else {
        y = 0;
      }
      buybackReserveBefore = max.times(2).minus(setupFee);
    });

    it("y == 0", async () => {
      assert.equal(y.toFixed(), 0);
    });

    it("fee != 0", async () => {
      assert.notEqual(fee.toFixed(), 0);
    });

    it("state=run", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.RUN);
    });

    it("send (buyback_reserve-y)*(1-investment_reserve)*(1-fee) to the beneficiary", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      const expected = buybackReserveBefore
        .minus(y)
        .times(new BigNumber(1).minus(investmentReserve))
        .times(new BigNumber(1).minus(fee))
        .plus(beneficiaryBalanceBefore);
      assert.equal(balance.toFixed(), expected.toFixed());
    });

    it("send setupFee to the setupFeeRecipient", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.setupFeeRecipient())
      );
      const expected = setupFeeRecipientBalanceBefore.plus(setupFee);
      assert.equal(balance.toFixed(), expected.toFixed());
    });

    it("send (buyback_reserve-y)*(1-investment_reserve)*fee to the fee_collector", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.feeCollector())
      );
      const expected = buybackReserveBefore
        .minus(y)
        .times(new BigNumber(1).minus(investmentReserve))
        .times(fee)
        .plus(feeCollectorBalanceBefore);
      assert.equal(balance.toFixed(), expected.toFixed());
    });

    it("update buyback_reserve = investment_reserve * (buyback_reserve-y) + y - setupFee", async () => {
      const buybackReserve = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      const expected = investmentReserve
        .times(buybackReserveBefore.minus(y))
        .plus(y);
      assert.equal(buybackReserve.toFixed(), expected.toFixed());
    });
  });

  describe("If total_supply - init_reserve >= init_goal (with an beneficiary investment)", () => {
    let buybackReserveBefore;
    let beneficiaryBalanceBefore;
    let feeCollectorBalanceBefore;
    let setupFeeRecipientBalanceBefore;
    let fee;
    let y;
    let investmentReserve;

    beforeEach(async () => {
      const buySlope = new BigNumber(await contracts.dat.buySlopeNum()).div(
        await contracts.dat.buySlopeDen()
      );
      feeCollectorBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.feeCollector())
      );
      setupFeeRecipientBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.setupFeeRecipient())
      );
      investmentReserve = new BigNumber(
        await contracts.dat.investmentReserveBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);
      fee = new BigNumber(await contracts.dat.feeBasisPoints()).div(
        constants.BASIS_POINTS_DEN
      );

      const max = buySlope.times(initGoal).times(initGoal).div(2).dp(0);
      await contracts.dat.buy(accounts[0], max.toFixed(), 1, {
        from: accounts[0],
        value: max.toFixed(),
      });
      beneficiaryBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      await contracts.dat.buy(accounts[5], max.toFixed(), 1, {
        from: accounts[5],
        value: max.toFixed(),
      });
      // y=init_investors[beneficiary]*buy_slope*init_goal/2
      y = new BigNumber(
        await contracts.dat.initInvestors(await contracts.dat.beneficiary())
      )
        .times(buySlope)
        .times(initGoal)
        .div(2);
      if (y.gt(setupFee)) {
        y = y.minus(setupFee);
      } else {
        y = 0;
      }
      buybackReserveBefore = max.times(2).minus(setupFee);
    });

    it("y > 0", async () => {
      assert.notEqual(y.toFixed(), 0);
    });

    it("fee != 0", async () => {
      assert.notEqual(fee.toFixed(), 0);
    });

    it("state=run", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.RUN);
    });

    it("send (buyback_reserve-y)*(1-investment_reserve)*(1-fee) to the beneficiary", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      const expected = buybackReserveBefore
        .minus(y)
        .times(new BigNumber(1).minus(investmentReserve))
        .times(new BigNumber(1).minus(fee))
        .plus(beneficiaryBalanceBefore);
      assert.equal(balance.toFixed(), expected.toFixed());
    });

    it("send setupFee to the setupFeeRecipient", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.setupFeeRecipient())
      );
      const expected = setupFeeRecipientBalanceBefore.plus(setupFee);
      assert.equal(balance.toFixed(), expected.toFixed());
    });

    it("send (buyback_reserve-y)*(1-investment_reserve)*fee to the fee_collector", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.feeCollector())
      );
      const expected = buybackReserveBefore
        .minus(y)
        .times(new BigNumber(1).minus(investmentReserve))
        .times(fee)
        .plus(feeCollectorBalanceBefore);
      assert.equal(balance.toFixed(), expected.toFixed());
    });

    it("update buyback_reserve = investment_reserve * (buyback_reserve-y) + y", async () => {
      const buybackReserve = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      const expected = buybackReserveBefore
        .minus(y)
        .times(investmentReserve)
        .plus(y);
      assert.equal(buybackReserve.toFixed(), expected.toFixed());
    });
  });
});
