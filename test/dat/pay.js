const { tokens } = require("hardlydifficult-ethereum-contracts");

const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat, getGasCost } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / pay", (accounts) => {
  let contracts;
  const investor = accounts[3];
  const payAmount = "42000000000000000000";

  beforeEach(async () => {
    contracts = await deployDat(
      accounts,
      {
        initGoal: "0", // Start in the run state
      },
      false
    );
    await approveAll(contracts, accounts);

    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i],
      });
    }
  });

  it("Sanity check: state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.RUN);
  });

  describe("on pay", () => {
    let investorBalanceBefore;

    beforeEach(async () => {
      investorBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(investor)
      );
      await contracts.dat.pay(payAmount, {
        from: investor,
        value: payAmount,
      });
    });

    it("The investor balance did not change", async () => {
      const balance = new BigNumber(await contracts.dat.balanceOf(investor));
      assert.equal(balance.toFixed(), investorBalanceBefore.toFixed());
    });
  });

  it("can make a tiny payment", async () => {
    await contracts.dat.pay("1", {
      from: investor,
      value: "1",
    });
  });

  it("shouldFail if currencyValue is missing", async () => {
    // Redeploy with an erc-20
    const token = await tokens.sai.deploy(web3, accounts[0]);
    await token.mint(accounts[0], constants.MAX_UINT, { from: accounts[0] });
    const contracts = await deployDat(
      accounts,
      {
        initGoal: "0", // Start in the run state
        currency: token.address,
      },
      false
    );
    await token.approve(contracts.dat.address, constants.MAX_UINT, {
      from: accounts[0],
    });
    await approveAll(contracts, accounts);
    await reverts(
      contracts.dat.pay("0", {
        from: accounts[0],
      }),
      "MISSING_CURRENCY"
    );
  });

  describe("If trades are restricted", () => {
    beforeEach(async () => {
      await contracts.whitelist.updateJurisdictionsForUserIds(
        [await contracts.dat.beneficiary()],
        [4],
        {
          from: await contracts.dat.control(),
        }
      );
      await contracts.whitelist.updateJurisdictionsForUserIds(
        [investor],
        [-1],
        {
          from: await contracts.dat.control(),
        }
      );
    });

    it("Can pay even if account is restricted", async () => {
      await contracts.dat.pay(payAmount, {
        from: investor,
        value: payAmount,
      });
    });

    describe("on pay", () => {
      let investorBalanceBefore;
      let investorCurrencyBalanceBefore;
      let beneficiaryBalanceBefore;
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

        const tx = await contracts.dat.pay(payAmount, {
          from: investor,
          value: payAmount,
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
    });
  });
});
