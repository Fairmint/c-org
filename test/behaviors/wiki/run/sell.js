const BigNumber = require("bignumber.js");
const { deployDat } = require("../../../datHelpers");
const { approveAll, constants, getGasCost } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (investor) {
  describe("Behavior / Wiki / Run / sell", () => {
    const initReserve = "1000000000000000000000";
    const buyAmount = "100000000000000000000";
    const sellAmount = "1000000000000000000";
    let beneficiary;
    let contracts;

    it("state is run", async function () {
      const state = await contracts.dat.state();
      assert.equal(state, constants.STATE.RUN);
    });

    it("If address == beneficiary, then the function exits.", async function () {
      await expectRevert(
        contracts.dat.sell(beneficiary, sellAmount, 1, { from: beneficiary }),
        "BENEFICIARY_ONLY_SELL_IN_CLOSE_OR_CANCEL"
      );
    });

    it("If init_goal=0 && buyback_reserve=0, then the function exits.", async function () {
      // This scenario occurs when an investor is given tokens from the initReserve before any `buy`
      contracts = await deployDat(accounts, {
        initGoal: 0,
        initReserve,
        feeBasisPoints: "10",
      });

      await contracts.whitelist.approveNewUsers([investor], [4], {
        from: await contracts.dat.control(),
      });

      await contracts.dat.transfer(investor, sellAmount, { from: beneficiary });
      await expectRevert(
        contracts.dat.sell(investor, sellAmount, 1, { from: investor }),
        "PRICE_SLIPPAGE"
      );
    });

    it("Sanity check: If init_goal=0 && buyback_reserve>0, then the function works.", async function () {
      // This scenario occurs when an investor is given tokens from the initReserve before any `buy`
      contracts = await deployDat(accounts, {
        initGoal: 0,
        initReserve,
        feeBasisPoints: "10",
      });

      await contracts.whitelist.approveNewUsers([investor], [4], {
        from: await contracts.dat.control(),
      });
      await contracts.whitelist.approveNewUsers([accounts[9]], [4], {
        from: await contracts.dat.control(),
      });

      await contracts.dat.transfer(investor, sellAmount, { from: beneficiary });
      await contracts.dat.buy(accounts[9], buyAmount, 1, {
        from: accounts[9],
        value: buyAmount,
      });
      await contracts.dat.sell(investor, sellAmount, 1, { from: investor });
    });

    // x=(total_supply+burnt_supply)*amount*sell_slope-((sell_slope*amount^2)/2)+(sell_slope*amount*burnt_supply^2)/(2*(total_supply)) with sell_slope=(2*buyback_reserve)/((total_supply+burnt_supply)^2).

    it("If x < minimum then the call fails.", async function () {
      const x = new BigNumber(
        await contracts.dat.estimateSellValue(sellAmount)
      );

      await expectRevert(
        contracts.dat.sell(investor, sellAmount, x.plus(1).toFixed(), {
          from: investor,
        }),
        "PRICE_SLIPPAGE"
      );
    });

    describe("On a successful sell", function () {
      let investorFairBalanceBefore;
      let investorCurrencyBalanceBefore;
      let totalSupplyBefore;
      let x;
      let gasCost;

      beforeEach(async function () {
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
          from: investor,
        });
        gasCost = await getGasCost(tx);
      });

      it("amount is being subtracted from the investor's balance.", async function () {
        const balance = new BigNumber(await contracts.dat.balanceOf(investor));
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

      it("initInvestment does not change.", async function () {
        const initInvestment = new BigNumber(
          await contracts.dat.initInvestors(investor)
        );
        assert.equal(initInvestment.toFixed(), 0);
      });

      it("The total_supply is decreased of amount FAIRs.", async function () {
        const totalSupply = new BigNumber(await contracts.dat.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.minus(sellAmount).toFixed()
        );
      });
    });

    it("if the value is less than the min specified then sell fails", async function () {
      // x=amount*buyback_reserve/(total_supply-init_reserve)
      const x = new BigNumber(
        await contracts.dat.estimateSellValue(sellAmount)
      );

      await expectRevert(
        contracts.dat.sell(investor, sellAmount, x.plus(1).toFixed(), {
          from: investor,
        }),
        "PRICE_SLIPPAGE"
      );
    });

    it("If the min is exact, the call works", async function () {
      // x=amount*buyback_reserve/(total_supply-init_reserve)
      const x = new BigNumber(
        await contracts.dat.estimateSellValue(sellAmount)
      );

      await contracts.dat.sell(investor, sellAmount, x.toFixed(), {
        from: investor,
      });
    });

    describe("If investor is not authorized, then the function exits.", function () {
      beforeEach(async function () {
        await contracts.whitelist.updateJurisdictionsForUserIds(
          [investor],
          [-1],
          {
            from: await contracts.dat.control(),
          }
        );
      });

      it("Sell fails", async function () {
        await expectRevert(
          contracts.dat.sell(investor, sellAmount, "1", {
            from: investor,
          }),
          "DENIED: JURISDICTION_FLOW"
        );
      });
    });
  });
};
