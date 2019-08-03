const BigNumber = require("bignumber.js");
const { constants, deployDat, shouldFail } = require("../../helpers");

contract("wiki / pay / run", accounts => {
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
        await contracts.fair.balanceOf(investor)
      );
      payValue = new BigNumber(await contracts.dat.estimatePayValue(payAmount));
      console.log(
        new BigNumber(await contracts.dat.estimatePayValue(payAmount)).toFixed()
      );
      console.log(
        new BigNumber(await contracts.dat.estimatePayValue(1)).toFixed()
      );
      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });

    it("The investor balance went up", async () => {
      const balance = new BigNumber(await contracts.fair.balanceOf(investor));
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
      await contracts.erc1404.updateRestriction(1);
    });

    it("Can pay even if account is restricted", async () => {
      await contracts.dat.pay(investor, payAmount, {
        from: investor,
        value: payAmount
      });
    });
  });
});
