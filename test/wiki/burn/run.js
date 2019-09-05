const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat } = require("../../helpers");

contract("wiki / burn / run", accounts => {
  let contracts;
  const investor = accounts[3];
  const burnAmount = "42";

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: "0" // Start in the run state
    });
    await approveAll(contracts, accounts);

    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
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

  describe("on burn", () => {
    let investorBalanceBefore, burnedSupplyBefore, totalSupplyBefore;

    beforeEach(async () => {
      burnedSupplyBefore = new BigNumber(await contracts.fair.burnedSupply());
      investorBalanceBefore = new BigNumber(
        await contracts.fair.balanceOf(investor)
      );
      totalSupplyBefore = new BigNumber(await contracts.fair.totalSupply());
      await contracts.fair.burn(burnAmount, [], {
        from: investor
      });
    });

    it("The burn amount was added to burnedSupply", async () => {
      const burnedSupply = new BigNumber(await contracts.fair.burnedSupply());
      assert.equal(
        burnedSupply.toFixed(),
        burnedSupplyBefore.plus(burnAmount).toFixed()
      );
    });

    it("The burn amount was deducted from totalSupply", async () => {
      const totalSupply = new BigNumber(await contracts.fair.totalSupply());
      assert.equal(
        totalSupply.toFixed(),
        totalSupplyBefore.minus(burnAmount).toFixed()
      );
    });

    it("The investor balance went down", async () => {
      const balance = new BigNumber(await contracts.fair.balanceOf(investor));
      assert.equal(
        balance.toFixed(),
        investorBalanceBefore.minus(burnAmount).toFixed()
      );
    });

    describe("Sanity check: burn again", () => {
      let investorBalanceBefore, burnedSupplyBefore, totalSupplyBefore;

      beforeEach(async () => {
        burnedSupplyBefore = new BigNumber(await contracts.fair.burnedSupply());
        investorBalanceBefore = new BigNumber(
          await contracts.fair.balanceOf(investor)
        );
        totalSupplyBefore = new BigNumber(await contracts.fair.totalSupply());
        await contracts.fair.burn(burnAmount, [], {
          from: investor
        });
      });

      it("The burn amount was added to burnedSupply", async () => {
        const burnedSupply = new BigNumber(await contracts.fair.burnedSupply());
        assert.equal(
          burnedSupply.toFixed(),
          burnedSupplyBefore.plus(burnAmount).toFixed()
        );
      });

      it("The burn amount was deducted from totalSupply", async () => {
        const totalSupply = new BigNumber(await contracts.fair.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.minus(burnAmount).toFixed()
        );
      });

      it("The investor balance went down", async () => {
        const balance = new BigNumber(await contracts.fair.balanceOf(investor));
        assert.equal(
          balance.toFixed(),
          investorBalanceBefore.minus(burnAmount).toFixed()
        );
      });
    });
  });

  describe("If trades are restricted", () => {
    beforeEach(async () => {
      await contracts.erc1404.approve(investor, false, {
        from: await contracts.dat.control()
      });
    });

    it("Can burn even if account is restricted", async () => {
      await contracts.fair.burn(burnAmount, [], {
        from: investor
      });
    });
  });
});
