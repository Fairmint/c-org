const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat } = require("../../helpers");

contract("wiki / sell / runBurn", accounts => {
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
      feeBasisPoints: "10",
      burnThresholdBasisPoints: 8000
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

  describe("on sell by any account pushing the beneficiary over the burn threshold", async () => {
    let beneficiaryFairBalanceBefore;
    let x;
    let burnedSupplyBefore;
    let expectedBurn;

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

      beneficiaryFairBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(await contracts.dat.beneficiary())
      );
      burnedSupplyBefore = new BigNumber(await contracts.dat.burnedSupply());
      const burnThreshold = new BigNumber(
        await contracts.dat.burnThresholdBasisPoints()
      ).div(constants.BASIS_POINTS_DEN);

      expectedBurn = x
        .plus(beneficiaryFairBalanceBefore)
        .minus(
          burnThreshold.times(
            new BigNumber(await contracts.dat.totalSupply())
              .plus(x)
              .plus(await contracts.dat.burnedSupply())
          )
        );
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

      x = new BigNumber(await contracts.dat.estimateSellValue(sellAmount));

      await contracts.dat.sell(investor, sellAmount, 1, {
        from: investor
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
});
