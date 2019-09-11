const BigNumber = require("bignumber.js");
const {
  approveAll,
  constants,
  deployDat,
  getGasCost,
  shouldFail
} = require("../../helpers");

contract("wiki / sell / run", accounts => {
  const initReserve = "1000000000000000000000";
  const buyAmount = "100000000000000000000";
  const sellAmount = "1000000000000000000";
  let beneficiary;
  const investor = accounts[3];
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0,
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

  it("state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state, constants.STATE.RUN);
  });

  it("If address == beneficiary, then the function exits.", async () => {
    await shouldFail(
      contracts.dat.sell(beneficiary, sellAmount, 1, { from: beneficiary })
    );
  });

  it("If init_goal=0 && buyback_reserve=0, then the function exits.", async () => {
    // This scenario occurs when an investor is given tokens from the initReserve before any `buy`
    contracts = await deployDat(accounts, {
      initGoal: 0,
      initReserve,
      feeBasisPoints: "10"
    });

    await contracts.whitelist.approve(investor, true, {
      from: await contracts.dat.control()
    });

    await contracts.dat.transfer(investor, sellAmount, { from: beneficiary });
    await shouldFail(
      contracts.dat.sell(investor, sellAmount, 1, { from: investor })
    );
  });

  it("Sanity check: If init_goal=0 && buyback_reserve>0, then the function works.", async () => {
    // This scenario occurs when an investor is given tokens from the initReserve before any `buy`
    contracts = await deployDat(accounts, {
      initGoal: 0,
      initReserve,
      feeBasisPoints: "10"
    });

    await contracts.whitelist.approve(investor, true, {
      from: await contracts.dat.control()
    });
    await contracts.whitelist.approve(accounts[9], true, {
      from: await contracts.dat.control()
    });

    await contracts.dat.transfer(investor, sellAmount, { from: beneficiary });
    await contracts.dat.buy(accounts[9], buyAmount, 1, {
      from: accounts[9],
      value: buyAmount
    });
    await contracts.dat.sell(investor, sellAmount, 1, { from: investor });
  });

  // x=(total_supply+burnt_supply)*amount*sell_slope-((sell_slope*amount^2)/2)+(sell_slope*amount*burnt_supply^2)/(2*(total_supply)) with sell_slope=(2*buyback_reserve)/((total_supply+burnt_supply)^2).

  it("If x < minimum then the call fails.", async () => {
    const x = new BigNumber(await contracts.dat.estimateSellValue(sellAmount));

    await shouldFail(
      contracts.dat.sell(investor, sellAmount, x.plus(1).toFixed(), {
        from: investor
      })
    );
  });

  describe("On a successful sell", () => {
    let investorFairBalanceBefore;
    let investorCurrencyBalanceBefore;
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

    it("initInvestment does not change.", async () => {
      const initInvestment = new BigNumber(
        await contracts.dat.initInvestors(investor)
      );
      assert.equal(initInvestment.toFixed(), 0);
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

  describe("If investor is not authorized, then the function exits.", () => {
    beforeEach(async () => {
      await contracts.whitelist.approve(investor, false, {
        from: await contracts.dat.control()
      });
    });

    it("Sell fails", async () => {
      await shouldFail(
        contracts.dat.sell(investor, sellAmount, "1", {
          from: investor
        })
      );
    });
  });
});
