const BigNumber = require("bignumber.js");
const vestingArtifact = artifacts.require("TokenVesting");
const {
  approveAll,
  constants,
  deployDat,
  shouldFail
} = require("../../helpers");

contract("wiki / buy / init", accounts => {
  const initGoal = "10000000000000000000000";
  const initReserve = "1000000000000000000000";
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal,
      initReserve,
      feeBasisPoints: "10"
    });

    await approveAll(contracts, accounts);
  });

  it("Sanity check: state is init", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.INIT);
  });

  describe("every investor receives tokens for the same price until init_goal is reached", () => {
    beforeEach(async () => {
      // Purchase with multiple accounts
      for (let i = 3; i < 6; i++) {
        await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
          from: accounts[i],
          value: "100000000000000000000"
        });
      }
    });

    it("Sanity check: investors received FAIR tokens", async () => {
      const balance = await contracts.dat.balanceOf(accounts[3]);
      assert.notEqual(balance.toString(), 0);
    });

    it("every investor has the same number of tokens for their equal investment", async () => {
      const expectedBalance = await contracts.dat.balanceOf(accounts[3]);
      for (let i = 4; i < 6; i++) {
        const accountBalance = await contracts.dat.balanceOf(accounts[i]);
        assert.equal(expectedBalance.toString(), accountBalance.toString());
      }
    });
  });

  describe("beneficiary is the only one allowed to transfer()", () => {
    it("Sanity check: state is still init", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.INIT);
    });

    describe("beneficiary can transfer to another account", () => {
      const targetAddress = accounts[9];

      it("Sanity check: targetAddress does not have any tokens yet", async () => {
        const balance = await contracts.dat.balanceOf(targetAddress);
        assert.equal(balance.toString(), 0);
      });

      it("Sanity check: beneficiary balance == initReserve", async () => {
        const balance = await contracts.dat.balanceOf(accounts[0]);
        assert.equal(balance.toString(), initReserve);
      });

      describe("transfer", () => {
        const transferAmount = "42";
        beforeEach(async () => {
          await contracts.dat.transfer(accounts[9], transferAmount);
        });

        it("beneficiary balance went down", async () => {
          const balance = await contracts.dat.balanceOf(accounts[0]);
          assert.equal(
            balance.toString(),
            new BigNumber(initReserve).minus(transferAmount).toFixed()
          );
        });

        it("target account balance went up", async () => {
          const balance = await contracts.dat.balanceOf(targetAddress);
          assert.equal(balance.toString(), transferAmount);
        });
      });
    });

    it("beneficiary can transfer to a vesting contract", async () => {
      const vesting = await vestingArtifact.new(
        accounts[0], // beneficiary
        Math.round(Date.now() / 1000) + 100, // startTime is seconds
        120, // cliffDuration in seconds
        200, // duration in seconds
        false, // non-revocable
        {
          from: accounts[1] // control
        }
      );
      await contracts.whitelist.approve(vesting.address, true, {
        from: await contracts.dat.control()
      });

      await contracts.dat.transfer(vesting.address, "42");
    });

    describe("other accounts cannot transfer", () => {
      const fromAccount = accounts[5];
      const toAccount = accounts[6];

      beforeEach(async () => {
        await contracts.dat.buy(fromAccount, "100000000000000000000", 1, {
          from: fromAccount,
          value: "100000000000000000000"
        });
      });

      it("Sanity check: state is still init", async () => {
        const state = await contracts.dat.state();
        assert.equal(state.toString(), constants.STATE.INIT);
      });

      it("Sanity check: from account has FAIR tokens", async () => {
        const balance = await contracts.dat.balanceOf(fromAccount);
        assert.notEqual(balance.toString(), 0);
        assert(balance.gt(42));
      });

      it("transfer shouldFail", async () => {
        await shouldFail(
          contracts.dat.transfer(toAccount, 42, { from: fromAccount })
        );
      });
    });
  });

  describe("If amount > (buy_slope*init_goal^2)/2 then the function exits", () => {
    const fromAccount = accounts[5];
    let max;

    beforeEach(async () => {
      const buySlope = new BigNumber(await contracts.dat.buySlopeNum()).div(
        await contracts.dat.buySlopeDen()
      );
      max = buySlope
        .times(initGoal)
        .times(initGoal)
        .div(2)
        .dp(0);
    });

    it("Sanity check: buy works if amount is less than max", async () => {
      await contracts.dat.buy(fromAccount, "100000000000000000000", 1, {
        from: fromAccount,
        value: "100000000000000000000"
      });
    });

    it("buy works if amount is exactly max", async () => {
      await contracts.dat.buy(fromAccount, max.toFixed(), 1, {
        from: fromAccount,
        value: max.toFixed()
      });
    });

    describe("buy works if amount is exactly max even if many tokens were previously bought", () => {
      beforeEach(async () => {
        await contracts.dat.buy(fromAccount, "100000000000000000000", 1, {
          from: fromAccount,
          value: "100000000000000000000"
        });
      });

      it("buy for max still works", async () => {
        await contracts.dat.buy(fromAccount, max.toFixed(), 1, {
          from: fromAccount,
          value: max.toFixed()
        });
      });
    });

    it("buy fails when amount is greater than max", async () => {
      await shouldFail(
        contracts.dat.buy(fromAccount, max.plus(100000000000).toFixed(), 1, {
          from: fromAccount,
          value: max.plus(100000000000).toFixed()
        })
      );
    });
  });

  describe("If investor is not allowed to buy FAIR, then the function exits.", () => {
    beforeEach(async () => {
      await contracts.whitelist.approve(accounts[5], false, {
        from: await contracts.dat.control()
      });
    });

    it("Buy fails", async () => {
      await shouldFail(
        contracts.dat.buy(accounts[5], "100000000000000000000", 1, {
          from: accounts[5],
          value: "100000000000000000000"
        })
      );
    });
  });

  it("If amount < min_investment, then the function exits.", async () => {
    const amount = new BigNumber(await contracts.dat.minInvestment()).minus(1);
    await shouldFail(
      contracts.dat.buy(accounts[5], amount.toFixed(), 1, {
        from: accounts[5],
        value: amount.toFixed()
      })
    );
  });

  describe("Add x to the investor's balance with x=2*amount/(buy_slope*init_goal)", () => {
    const fromAccount = accounts[5];
    const amount = "100000000000000000000";
    let x;

    beforeEach(async () => {
      await contracts.dat.buy(fromAccount, amount, 1, {
        from: fromAccount,
        value: amount
      });
      const buySlope = new BigNumber(await contracts.dat.buySlopeNum()).div(
        await contracts.dat.buySlopeDen()
      );
      x = new BigNumber(2).times(amount).div(buySlope.times(initGoal));
    });

    it("Investor's balance went up by x", async () => {
      const balance = await contracts.dat.balanceOf(fromAccount);
      assert.equal(balance.toString(), x.toFixed());
    });

    it("Increase total_supply with x new FAIRs", async () => {
      const totalSupply = await contracts.dat.totalSupply();
      assert.equal(totalSupply.toString(), x.plus(initReserve).toFixed());
    });

    it("Add amount to the buyback_reserve", async () => {
      const buybackReserve = await contracts.dat.buybackReserve();
      assert.equal(buybackReserve.toString(), amount);
    });

    it("Save investor's total investment in init_investors[address]+=x", async () => {
      const balance = await contracts.dat.initInvestors(fromAccount);
      assert.equal(balance.toString(), x.toFixed());
    });

    describe("purchase again", () => {
      beforeEach(async () => {
        await contracts.dat.buy(fromAccount, amount, 1, {
          from: fromAccount,
          value: amount
        });
      });

      it("Investor's balance went up by x * 2", async () => {
        const balance = await contracts.dat.balanceOf(fromAccount);
        assert.equal(balance.toString(), x.times(2).toFixed());
      });

      it("Increase total_supply with x new FAIRs", async () => {
        const totalSupply = await contracts.dat.totalSupply();
        assert.equal(
          totalSupply.toString(),
          x
            .times(2)
            .plus(initReserve)
            .toFixed()
        );
      });

      it("Add amount to the buyback_reserve", async () => {
        const buybackReserve = await contracts.dat.buybackReserve();
        assert.equal(buybackReserve.toString(), new BigNumber(amount).times(2));
      });

      it("Save investor's total investment in init_investors[address]+=x", async () => {
        const balance = await contracts.dat.initInvestors(fromAccount);
        assert.equal(balance.toString(), x.times(2).toFixed());
      });
    });
  });

  describe("If total_supply - init_reserve >= init_goal (no beneficiary investment)", () => {
    let buybackReserveBefore;
    let beneficiaryBalanceBefore;
    let feeCollectorBalanceBefore;
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
      investmentReserve = new BigNumber(
        await contracts.dat.investmentReserveBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);
      fee = new BigNumber(await contracts.dat.feeBasisPoints()).div(
        constants.BASIS_POINTS_DEN
      );

      const max = buySlope
        .times(initGoal)
        .times(initGoal)
        .div(2)
        .dp(0);
      for (let i = 0; i < 2; i++) {
        await contracts.dat.buy(accounts[5], max.toFixed(), 1, {
          from: accounts[5],
          value: max.toFixed()
        });
      }
      // y=init_investors[beneficiary]*buy_slope*init_goal/2
      y = new BigNumber(
        await contracts.dat.initInvestors(await contracts.dat.beneficiary())
      )
        .times(buySlope)
        .times(initGoal)
        .div(2);
      buybackReserveBefore = max.times(2);
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
      const expected = investmentReserve.times(buybackReserveBefore.minus(y));
      assert.equal(buybackReserve.toFixed(), expected.toFixed());
    });
  });

  describe("If total_supply - init_reserve >= init_goal (with an beneficiary investment)", () => {
    let buybackReserveBefore;
    let beneficiaryBalanceBefore;
    let feeCollectorBalanceBefore;
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
      investmentReserve = new BigNumber(
        await contracts.dat.investmentReserveBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);
      fee = new BigNumber(await contracts.dat.feeBasisPoints()).div(
        constants.BASIS_POINTS_DEN
      );

      const max = buySlope
        .times(initGoal)
        .times(initGoal)
        .div(2)
        .dp(0);
      await contracts.dat.buy(accounts[0], max.toFixed(), 1, {
        from: accounts[0],
        value: max.toFixed()
      });
      beneficiaryBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      await contracts.dat.buy(accounts[5], max.toFixed(), 1, {
        from: accounts[5],
        value: max.toFixed()
      });
      // y=init_investors[beneficiary]*buy_slope*init_goal/2
      y = new BigNumber(
        await contracts.dat.initInvestors(await contracts.dat.beneficiary())
      )
        .times(buySlope)
        .times(initGoal)
        .div(2);
      buybackReserveBefore = max.times(2);
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
