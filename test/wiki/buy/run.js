const BigNumber = require("bignumber.js");
const {
  approveAll,
  constants,
  deployDat,
  shouldFail
} = require("../../helpers");

contract("wiki / buy / run", accounts => {
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0,
      feeBasisPoints: 10,
      autoBurn: true
    });

    await approveAll(contracts, accounts);
  });

  it("state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state, constants.STATE.RUN);
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

  // x=sqrt((2*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)

  describe("If x < minimum then the call fails.", () => {
    const amount = "100000000000000000000";
    let x;

    beforeEach(async () => {
      x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
    });

    it("buying with min+1 should fail", async () => {
      await shouldFail(
        contracts.dat.buy(accounts[5], amount, x.plus(1).toFixed(), {
          from: accounts[5],
          value: amount
        })
      );
    });

    it("Sanity check buying x works", async () => {
      await contracts.dat.buy(accounts[5], amount, x.toFixed(), {
        from: accounts[5],
        value: amount
      });
    });
  });

  describe("Mint x tokens.", () => {
    const amount = "100000000000000000000";
    let balanceBefore;
    let totalSupplyBefore;
    let x;

    beforeEach(async () => {
      balanceBefore = new BigNumber(await contracts.dat.balanceOf(accounts[5]));
      totalSupplyBefore = new BigNumber(await contracts.dat.totalSupply());
      x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
      await contracts.dat.buy(accounts[5], amount, 1, {
        from: accounts[5],
        value: amount
      });
    });

    it("Add x FAIRs to the investor's balance.", async () => {
      const balance = new BigNumber(await contracts.dat.balanceOf(accounts[5]));
      assert.equal(balance.toFixed(), balanceBefore.plus(x).toFixed());
    });

    it("Increase total_supply with x new FAIRs.", async () => {
      const totalSupply = new BigNumber(await contracts.dat.totalSupply());
      assert.equal(totalSupply.toFixed(), totalSupplyBefore.plus(x).toFixed());
    });

    describe("Mint more tokens", () => {
      beforeEach(async () => {
        balanceBefore = new BigNumber(
          await contracts.dat.balanceOf(accounts[5])
        );
        totalSupplyBefore = new BigNumber(await contracts.dat.totalSupply());
        x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
        await contracts.dat.buy(accounts[5], amount, 1, {
          from: accounts[5],
          value: amount
        });
      });

      it("Add x FAIRs to the investor's balance.", async () => {
        const balance = new BigNumber(
          await contracts.dat.balanceOf(accounts[5])
        );
        assert.equal(balance.toFixed(), balanceBefore.plus(x).toFixed());
      });

      it("Increase total_supply with x new FAIRs.", async () => {
        const totalSupply = new BigNumber(await contracts.dat.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.plus(x).toFixed()
        );
      });
    });
  });

  describe("If the investor is the beneficiary", () => {
    const amount = "100000000000000000000";
    let from;
    let x;
    let burnAmount;
    let burnBefore;
    let buybackReserveBefore;

    beforeEach(async () => {
      from = await contracts.dat.beneficiary();
    });

    describe("if (x+investor_balance)/(total_supply+burnt_supply) >= burn_threshold", () => {
      beforeEach(async () => {
        x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
        const investorBalance = new BigNumber(
          await contracts.dat.balanceOf(from)
        );
        burnAmount = x;

        burnBefore = new BigNumber(await contracts.dat.burnedSupply());
        buybackReserveBefore = new BigNumber(
          await contracts.dat.buybackReserve()
        );

        await contracts.dat.buy(from, amount, 1, {
          from,
          value: amount
        });
      });

      it("Sanity check: state is run", async () => {
        const state = await contracts.dat.state();
        assert.equal(state, constants.STATE.RUN);
      });

      it("burn((x+investor_balance)-(burn_threshold*(total_supply+burnt_supply))", async () => {
        const burned = new BigNumber(await contracts.dat.burnedSupply()).minus(
          burnBefore
        );
        assert.equal(burnAmount.toFixed(), burned.toFixed());
        assert(burned.gt(0));
      });

      it("the full amount is added to the buyback_reserve", async () => {
        const buybackReserve = new BigNumber(
          await contracts.dat.buybackReserve()
        );
        assert.equal(
          buybackReserve.toFixed(),
          buybackReserveBefore.plus(amount).toFixed()
        );
      });
    });
  });

  describe("If the investor is not the beneficiary", () => {
    const from = accounts[3];
    let beneficiary;
    let feeCollector;
    const amount = "100000000000000000000";
    let investmentReserve, fee;
    let buybackReserveBefore, beneficiaryBefore, feeCollectorBefore;

    beforeEach(async () => {
      investmentReserve = new BigNumber(
        await contracts.dat.investmentReserveBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);
      fee = new BigNumber(await contracts.dat.feeBasisPoints()).div(
        constants.BASIS_POINTS_DEN
      );
      buybackReserveBefore = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      beneficiary = await contracts.dat.beneficiary();
      beneficiaryBefore = new BigNumber(await web3.eth.getBalance(beneficiary));
      feeCollector = await contracts.dat.feeCollector();
      feeCollectorBefore = new BigNumber(
        await web3.eth.getBalance(feeCollector)
      );

      await contracts.dat.buy(from, amount, 1, {
        from: from,
        value: amount
      });
    });

    it("investment_reserve*amount is being added to the buyback_reserve", async () => {
      const buybackReserve = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      const delta = investmentReserve.times(amount);
      assert.equal(
        buybackReserve.toFixed(),
        buybackReserveBefore.plus(delta).toFixed()
      );
      assert(delta.gt(0));
    });

    it("(1-investment_reserve)*amount*(1-fee) is being transfered to beneficiary", async () => {
      const balance = new BigNumber(await web3.eth.getBalance(beneficiary));

      const delta = new BigNumber(1)
        .minus(investmentReserve)
        .times(amount)
        .times(new BigNumber(1).minus(fee));
      assert.equal(balance.toFixed(), beneficiaryBefore.plus(delta).toFixed());
      assert(delta.gt(0));
    });

    it("(1-investment_reserve)*amount*fee is being sent to fee_collector", async () => {
      const balance = new BigNumber(await web3.eth.getBalance(feeCollector));
      const delta = new BigNumber(1)
        .minus(investmentReserve)
        .times(amount)
        .times(fee);
      assert.equal(balance.toFixed(), feeCollectorBefore.plus(delta).toFixed());
      assert(delta.gt(0));
    });
  });
});
