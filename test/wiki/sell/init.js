const BigNumber = require("bignumber.js");
const {
  approveAll,
  constants,
  deployDat,
  getGasCost,
  shouldFail
} = require("../../helpers");

contract("wiki / sell / init", accounts => {
  const initGoal = "10000000000000000000000";
  const initReserve = "1000000000000000000000";
  const buyAmount = "100000000000000000000";
  const sellAmount = "1000000000000000000";
  let beneficiary;
  const investor = accounts[3];
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal,
      initReserve,
      feeBasisPoints: "10"
    });

    await approveAll(contracts, accounts);

    beneficiary = await contracts.dat.beneficiary();

    // Buy with various accounts including the beneficiary account
    for (let i = 0; i < 5; i++) {
      await contracts.dat.buy(accounts[i], buyAmount, 1, {
        from: accounts[i],
        value: buyAmount
      });
    }
  });

  it("Sanity check: state is init", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.INIT);
  });

  it("If address == beneficiary, then the function exits.", async () => {
    await shouldFail(
      contracts.dat.sell(beneficiary, sellAmount, 1, { from: beneficiary })
    );
  });

  describe("if the investor was awarded tokens from the initReserve", () => {
    beforeEach(async () => {
      await contracts.dat.transfer(investor, initReserve, {
        from: beneficiary
      });
    });

    it("If init_investors[address]<amount then the call fails.", async () => {
      await shouldFail(
        contracts.dat.sell(investor, initReserve, 1, { from: investor })
      );
    });

    it("The call works if amount==init_investors[address]", async () => {
      const initInvestment = await contracts.dat.initInvestors(investor);
      await contracts.dat.sell(investor, initInvestment, 1, { from: investor });
      assert.notEqual(initInvestment.toString(), 0);
      assert.equal((await contracts.dat.initInvestors(investor)).toString(), 0);
    });
  });

  describe("On a successful sell", () => {
    let investorFairBalanceBefore;
    let investorCurrencyBalanceBefore;
    let initInvestmentBefore;
    let totalSupplyBefore;
    let x;
    let gasCost;

    beforeEach(async () => {
      investorFairBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(investor)
      );
      investorCurrencyBalanceBefore = new BigNumber(
        await web3.eth.getBalance(investor)
      );
      initInvestmentBefore = new BigNumber(
        await contracts.dat.initInvestors(investor)
      );
      totalSupplyBefore = new BigNumber(await contracts.dat.totalSupply());

      // x=amount*buyback_reserve/(total_supply-init_reserve)
      x = new BigNumber(await contracts.dat.estimateSellValue(sellAmount));

      const tx = await contracts.dat.sell(investor, sellAmount, 1, {
        from: investor
      });
      gasCost = await getGasCost(tx);
    });

    it("amount is being substracted from the investor's balance.", async () => {
      const balance = new BigNumber(await contracts.dat.balanceOf(investor));
      assert.equal(
        balance.toFixed(),
        investorFairBalanceBefore.minus(sellAmount).toFixed()
      );
    });

    it("The investor receives x collateral value from the buyback_reserve.", async () => {
      const balance = new BigNumber(await web3.eth.getBalance(investor));
      assert.equal(
        balance.toFixed(),
        investorCurrencyBalanceBefore
          .plus(x)
          .minus(gasCost)
          .toFixed()
      );
      assert.notEqual(x.toFixed(), 0);
    });

    it("Save investor's total withdrawal in init_investors[address]-=amount.", async () => {
      const initInvestment = new BigNumber(
        await contracts.dat.initInvestors(investor)
      );
      assert.equal(
        initInvestment.toFixed(),
        initInvestmentBefore.minus(sellAmount).toFixed()
      );
    });

    it("The total_supply is decreased of amount FAIRs.", async () => {
      const totalSupply = new BigNumber(await contracts.dat.totalSupply());
      assert.equal(
        totalSupply.toFixed(),
        totalSupplyBefore.minus(sellAmount).toFixed()
      );
    });
  });

  it("if the value is less than the min specified then sell fails", async () => {
    // x=amount*buyback_reserve/(total_supply-init_reserve)
    const x = new BigNumber(await contracts.dat.estimateSellValue(sellAmount));

    await shouldFail(
      contracts.dat.sell(investor, sellAmount, x.plus(1).toFixed(), {
        from: investor
      })
    );
  });

  it("If the min is exact, the call works", async () => {
    // x=amount*buyback_reserve/(total_supply-init_reserve)
    const x = new BigNumber(await contracts.dat.estimateSellValue(sellAmount));

    await contracts.dat.sell(investor, sellAmount, x.toFixed(), {
      from: investor
    });
  });
});
