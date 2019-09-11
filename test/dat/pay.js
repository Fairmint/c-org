const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat, getGasCost } = require("../helpers");

contract("dat / pay", accounts => {
  let contracts;
  const investor = accounts[3];
  const payAmount = "42000000000000000000";

  before(async () => {
    contracts = await deployDat(
      accounts,
      {
        initGoal: "0" // Start in the run state
      },
      false
    );
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

  describe("on pay", () => {
    let investorBalanceBefore;
    let payValue;

    beforeEach(async () => {
      investorBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(investor)
      );
      payValue = new BigNumber(await contracts.dat.estimatePayValue(payAmount));
      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    it("The investor balance went up", async () => {
      const balance = new BigNumber(await contracts.dat.balanceOf(investor));
      assert.equal(
        balance.toFixed(),
        investorBalanceBefore.plus(payValue).toFixed()
      );
    });
  });

  it("can make a tiny payment", async () => {
    await contracts.dat.pay(investor, "1", {
      from: investor,
      value: "1"
    });
  });

  describe("If trades are restricted", () => {
    beforeEach(async () => {
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
    });

    it("Can pay even if account is restricted", async () => {
      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    describe("on pay", () => {
      let investorBalanceBefore;
      let investorCurrencyBalanceBefore;
      let beneficiaryBalanceBefore;
      let payValue;
      let gasCost;

      beforeEach(async () => {
        investorBalanceBefore = new BigNumber(
          await contracts.dat.balanceOf(investor)
        );
        investorCurrencyBalanceBefore = new BigNumber(
          await web3.eth.getBalance(investor)
        );
        beneficiaryBalanceBefore = new BigNumber(
          await contracts.dat.balanceOf(await contracts.dat.beneficiary())
        );
        payValue = new BigNumber(
          await contracts.dat.estimatePayValue(payAmount)
        );

        const tx = await contracts.dat.pay(investor, payAmount, {
          from: investor,
          value: payAmount
        });
        gasCost = await getGasCost(tx);
      });

      it("The investors token balance did not change", async () => {
        const balance = new BigNumber(await contracts.dat.balanceOf(investor));
        assert.equal(balance.toFixed(), investorBalanceBefore.toFixed());
      });

      it("The investor currency balance went down", async () => {
        const balance = new BigNumber(await web3.eth.getBalance(investor));
        assert.equal(
          balance.toFixed(),
          investorCurrencyBalanceBefore
            .minus(payAmount)
            .minus(gasCost)
            .toFixed()
        );
      });

      it("Tokens went to the beneficiary account instead", async () => {
        const balance = new BigNumber(
          await contracts.dat.balanceOf(await contracts.dat.beneficiary())
        );
        assert.equal(
          balance.toFixed(),
          beneficiaryBalanceBefore.plus(payValue).toFixed()
        );
      });
    });
  });
});
