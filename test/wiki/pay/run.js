const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat } = require("../../helpers");

contract("wiki / pay / run", (accounts) => {
  let contracts;
  const investor = accounts[3];
  const payAmount = "42000000000000000000";
  let totalSupplyBefore;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "0", // Start in the run state
    });

    await approveAll(contracts, accounts);

    // Buy tokens for various accounts
    for (let i = 9; i >= 0; i--) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i],
      });
    }

    totalSupplyBefore = new BigNumber(await contracts.dat.totalSupply());
  });

  it("Sanity check: state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.RUN);
  });

  describe("on pay to a 3rd party", () => {
    let buybackReserveBefore;
    let beneficiaryCurrencyBefore;
    let revenueCommitment;

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

      await contracts.dat.pay(payAmount, {
        from: investor,
        value: payAmount,
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

    it("(1-revenue_commitment)*amount is being transferred to the beneficiary", async () => {
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

    it("The total_supply is not changed", async () => {
      const totalSupply = new BigNumber(await contracts.dat.totalSupply());
      assert.equal(totalSupply.toFixed(), totalSupplyBefore.toFixed());
    });
  });

  describe("on pay to the beneficiary", async () => {
    let burnedSupplyBefore;

    beforeEach(async () => {
      await contracts.whitelist.updateJurisdictionsForUserIds(
        [investor],
        [-1],
        {
          from: await contracts.dat.control(),
        }
      );
      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());

      await contracts.dat.pay(payAmount, {
        from: investor,
        value: payAmount,
      });
    });

    it("The total_supply is not changed", async () => {
      const totalSupply = new BigNumber(await contracts.dat.totalSupply());
      assert.equal(totalSupply.toFixed(), totalSupplyBefore.toFixed());
    });
  });

  describe("on pay to the beneficiary going over the burn threshold", async () => {
    let beneficiaryFairBalanceBefore;
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
            from: accounts[i],
          }
        );
      }

      beneficiaryFairBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(await contracts.dat.beneficiary())
      );
      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());

      await contracts.whitelist.updateJurisdictionsForUserIds(
        [investor],
        [-1],
        {
          from: await contracts.dat.control(),
        }
      );

      await contracts.dat.pay(payAmount, {
        from: investor,
        value: payAmount,
      });
    });

    it("No tokens are burned", async () => {
      const burnedSupply = new BigNumber(await contracts.dat.burnedSupply());
      assert.equal(burnedSupply.toFixed(), burnedSupplyBefore.toFixed());
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
            from: accounts[i],
          }
        );
      }

      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());

      await contracts.dat.pay(payAmount, {
        from: investor,
        value: payAmount,
      });
    });

    it("nothing burned", async () => {
      const burnedSupply = new BigNumber(await contracts.dat.burnedSupply());
      assert.equal(burnedSupply.toFixed(), burnedSupplyBefore.toFixed());
    });
  });
});
