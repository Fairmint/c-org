const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat } = require("../../helpers");

contract("wiki / pay / run", accounts => {
  let contracts;
  const investor = accounts[3];
  const payAmount = "42000000000000000000";

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "0", // Start in the run state
      autoBurn: true
    });

    await approveAll(contracts, accounts);

    // Buy tokens for various accounts
    for (let i = 9; i >= 0; i--) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i]
      });
    }
  });

  it("Sanity check: state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.RUN);
  });

  describe("on pay to a 3rd party", () => {
    let buybackReserveBefore;
    let beneficiaryCurrencyBefore;
    let revenueCommitment;
    let investorFairBalanceBefore;
    let totalSupplyBefore;
    let x;

    beforeEach(async () => {
      buybackReserveBefore = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      beneficiaryCurrencyBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      revenueCommitment = new BigNumber(
        await contracts.dat.revenueCommitmentBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);
      x = new BigNumber(await contracts.dat.estimatePayValue(payAmount));
      investorFairBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(investor)
      );
      totalSupplyBefore = new BigNumber(await contracts.dat.totalSupply());

      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    it("revenue_commitment*amount is being added to the buyback_reserve.", async () => {
      const buybackReserve = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      assert.equal(
        buybackReserve.toFixed(),
        buybackReserveBefore
          .plus(revenueCommitment.times(payAmount).dp(0, BigNumber.ROUND_UP))
          .toFixed()
      );
    });

    it("(1-revenue_commitment)*amount is being transfered to the beneficiary", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      assert.equal(
        balance.toFixed(),
        beneficiaryCurrencyBefore
          .plus(
            new BigNumber(1)
              .minus(revenueCommitment)
              .times(payAmount)
              .dp(0, BigNumber.ROUND_DOWN)
          )
          .toFixed()
      );
    });

    // x the number of newly issued FAIRs with x=sqrt((2*revenue_commitment*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)

    it("If to is specified and is allowed to receive FAIRs,x FAIRs are added to the to address specified", async () => {
      const balance = new BigNumber(await contracts.dat.balanceOf(investor));
      assert.equal(
        balance.toFixed(),
        investorFairBalanceBefore.plus(x).toFixed()
      );
    });

    it("The total_supply is increased with x new FAIRs.", async () => {
      const totalSupply = new BigNumber(await contracts.dat.totalSupply());
      assert.equal(totalSupply.toFixed(), totalSupplyBefore.plus(x).toFixed());
    });
  });

  describe("on pay to the beneficiary", async () => {
    let burnedSupplyBefore;
    let x;

    beforeEach(async () => {
      x = new BigNumber(await contracts.dat.estimatePayValue(payAmount));

      await contracts.whitelist.approve(investor, false, {
        from: await contracts.dat.control()
      });
      await contracts.whitelist.approve(
        await contracts.dat.beneficiary(),
        true,
        {
          from: await contracts.dat.control()
        }
      );
      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());

      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    it("If to is not allowed to receive FAIRs, x FAIRs are burned on the beneficiary's behalf.", async () => {
      const balance = new BigNumber(await contracts.dat.burnedSupply());
      assert.equal(balance.toFixed(), burnedSupplyBefore.plus(x).toFixed());
    });
  });

  describe("on pay to the beneficiary going over the burn threshold", async () => {
    let beneficiaryFairBalanceBefore;
    let x;
    let burnedSupplyBefore;
    let expectedBurn;
    let payAmount = "4200000000000000000000";

    beforeEach(async () => {
      // Buy tokens for the beneficiary so they are close to the burnThreshold
      for (let i = 0; i < 9; i++) {
        await contracts.dat.buy(
          await contracts.dat.beneficiary(),
          "10000000000000000000000",
          1,
          {
            value: "10000000000000000000000",
            from: accounts[i]
          }
        );
      }

      x = new BigNumber(await contracts.dat.estimatePayValue(payAmount));
      beneficiaryFairBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(await contracts.dat.beneficiary())
      );
      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());
      //(x+investor_balance)-(burn_threshold*(total_supply+burnt_supply)
      expectedBurn = x;
      await contracts.whitelist.approve(
        await contracts.dat.beneficiary(),
        true,
        {
          from: await contracts.dat.control()
        }
      );

      await contracts.whitelist.approve(investor, false, {
        from: await contracts.dat.control()
      });

      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    it("Sanity check: expected burn > 0", async () => {
      assert.notEqual(expectedBurn.toFixed(), 0);
      assert(expectedBurn.gt(0));
    });

    it("If (x+investor_balance)/(total_supply+burnt_supply) >= burn_threshold then burn((x+investor_balance)-(burn_threshold*(total_supply+burnt_supply)) is called.", async () => {
      const burnedSupply = new BigNumber(await contracts.dat.burnedSupply());
      assert.equal(
        burnedSupply.toFixed(),
        burnedSupplyBefore.plus(expectedBurn).toFixed()
      );
    });

    it("x - expectedBurn is added to the beneficiary's balance", async () => {
      const balance = new BigNumber(
        await contracts.dat.balanceOf(await contracts.dat.beneficiary())
      );
      assert.equal(
        balance.toFixed(),
        beneficiaryFairBalanceBefore
          .plus(x)
          .minus(expectedBurn)
          .toFixed()
      );
    });
  });

  describe("Sanity: a large pay to a 3rd party does not burn", async () => {
    let burnedSupplyBefore;
    let payAmount = "4200000000000000000000";

    beforeEach(async () => {
      // Buy tokens for the beneficiary so they are close to the burnThreshold
      for (let i = 0; i < 9; i++) {
        await contracts.dat.buy(
          await contracts.dat.beneficiary(),
          "10000000000000000000000",
          1,
          {
            value: "10000000000000000000000",
            from: accounts[i]
          }
        );
      }

      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());

      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    it("nothing burned", async () => {
      const burnedSupply = new BigNumber(await contracts.dat.burnedSupply());
      assert.equal(burnedSupply.toFixed(), burnedSupplyBefore.toFixed());
    });
  });
});
