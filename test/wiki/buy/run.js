const BigNumber = require("bignumber.js");
const { constants, deployDat, shouldFail } = require("../../helpers");

contract("wiki / buy / run", accounts => {
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0
    });
  });

  it("state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state, constants.STATE.RUN);
  });

  describe("If investor is not allowed to buy FAIR, then the function exits.", () => {
    beforeEach(async () => {
      await contracts.erc1404.updateRestriction(1);
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
      balanceBefore = new BigNumber(
        await contracts.fair.balanceOf(accounts[5])
      );
      totalSupplyBefore = new BigNumber(await contracts.fair.totalSupply());
      x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
      await contracts.dat.buy(accounts[5], amount, 1, {
        from: accounts[5],
        value: amount
      });
    });

    it("Add x FAIRs to the investor's balance.", async () => {
      const balance = new BigNumber(
        await contracts.fair.balanceOf(accounts[5])
      );
      assert.equal(balance.toFixed(), balanceBefore.plus(x).toFixed());
    });

    it("Increase total_supply with x new FAIRs.", async () => {
      const totalSupply = new BigNumber(await contracts.fair.totalSupply());
      assert.equal(totalSupply.toFixed(), totalSupplyBefore.plus(x).toFixed());
    });

    describe("Mint more tokens", () => {
      beforeEach(async () => {
        balanceBefore = new BigNumber(
          await contracts.fair.balanceOf(accounts[5])
        );
        totalSupplyBefore = new BigNumber(await contracts.fair.totalSupply());
        x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
        await contracts.dat.buy(accounts[5], amount, 1, {
          from: accounts[5],
          value: amount
        });
      });

      it("Add x FAIRs to the investor's balance.", async () => {
        const balance = new BigNumber(
          await contracts.fair.balanceOf(accounts[5])
        );
        assert.equal(balance.toFixed(), balanceBefore.plus(x).toFixed());
      });

      it("Increase total_supply with x new FAIRs.", async () => {
        const totalSupply = new BigNumber(await contracts.fair.totalSupply());
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
        contracts = await deployDat(accounts, {
          initGoal: 0,
          burnThresholdBasisPoints: 8000 // 80%
        });

        x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
        const investorBalance = new BigNumber(
          await contracts.fair.balanceOf(from)
        );
        burnAmount = x
          .plus(investorBalance)
          .minus(
            new BigNumber(await contracts.dat.burnThresholdBasisPoints())
              .div(constants.BASIS_POINTS_DEN)
              .times(
                new BigNumber(await contracts.fair.totalSupply())
                  .plus(x)
                  .plus(await contracts.fair.burnedSupply())
              )
          );

        burnBefore = new BigNumber(await contracts.fair.burnedSupply());
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
        const burned = new BigNumber(await contracts.fair.burnedSupply()).minus(
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

    describe("if (x+investor_balance)/(total_supply+burnt_supply) < burn_threshold", () => {
      beforeEach(async () => {
        // Other accounts need to buy some first
        for (let i = 3; i < 5; i++) {
          await contracts.dat.buy(accounts[i], amount, 1, {
            from: accounts[i],
            value: amount
          });
        }

        x = new BigNumber(await contracts.dat.estimateBuyValue(amount));
        const investorBalance = new BigNumber(
          await contracts.fair.balanceOf(from)
        );
        burnAmount = x
          .plus(investorBalance)
          .minus(
            new BigNumber(await contracts.dat.burnThresholdBasisPoints())
              .div(constants.BASIS_POINTS_DEN)
              .times(
                new BigNumber(await contracts.fair.totalSupply()).plus(
                  await contracts.fair.burnedSupply()
                )
              )
          );
        buybackReserveBefore = new BigNumber(
          await contracts.dat.buybackReserve()
        );

        await contracts.dat.buy(from, amount, 1, {
          from,
          value: amount
        });
      });

      it("no burn", async () => {
        const burned = new BigNumber(await contracts.fair.burnedSupply());
        assert.equal(burned.toFixed(), 0);
        assert(burnAmount.lte(0));
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
    it("investment_reserve*amount is being added to the buyback_reserve");
    it(
      "(1-investment_reserve)*amount*(1-fee) is being transfered to beneficiary"
    );
    it("(1-investment_reserve)*amount*fee is being sent to fee_collector");
  });
});
