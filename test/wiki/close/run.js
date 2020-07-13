const { tokens } = require("hardlydifficult-ethereum-contracts");
const { time } = require("@openzeppelin/test-helpers");

const BigNumber = require("bignumber.js");
const { deployDat, updateDatConfig } = require("../../datHelpers");
const { approveAll, constants, getGasCost } = require("../../helpers");
const { reverts } = require("truffle-assertions");

contract("wiki / close / run", (accounts) => {
  let contracts;

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
  });

  it("Sanity check: state is run", async () => {
    const state = await contracts.dat.state();
    assert.equal(state.toString(), constants.STATE.RUN);
  });

  it("If address != beneficiary then the function exits.", async () => {
    await reverts(
      contracts.dat.close({
        from: accounts[9],
        value: "10000000000000000000000",
      }),
      "BENEFICIARY_ONLY"
    );
  });

  describe("when locked", async () => {
    beforeEach(async () => {
      const currentTime = new BigNumber(await time.latest());
      await updateDatConfig(contracts, {
        minDuration: currentTime.plus(10).toFixed(),
      });
    });

    it("If now < minDuration then close fails", async () => {
      await reverts(
        contracts.dat.close({
          from: await contracts.dat.beneficiary(),
          value: "10000000000000000000000",
        }),
        "TOO_EARLY"
      );
    });

    describe("after the lock expires", () => {
      beforeEach(async () => {
        await time.increase(11);
      });

      it("then close works again", async () => {
        await contracts.dat.close({
          from: await contracts.dat.beneficiary(),
          value: "10000000000000000000000",
        });
      });
    });
  });

  describe("on close", () => {
    let beneficiaryBalanceBefore;
    let buybackReserveBefore;
    let exitFee;
    let gasCost;

    beforeEach(async () => {
      beneficiaryBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      buybackReserveBefore = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      exitFee = new BigNumber(await contracts.dat.estimateExitFee(0));
      const tx = await contracts.dat.close({
        from: await contracts.dat.beneficiary(),
        value: exitFee.toFixed(),
      });
      gasCost = await getGasCost(tx);
    });

    it("Set state = 'close'", async () => {
      const state = await contracts.dat.state();
      assert.equal(state.toString(), constants.STATE.CLOSE);
    });

    it("substract (total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply - buyback_reserve from the balance of beneficiary.", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      assert.equal(
        balance.toFixed(),
        beneficiaryBalanceBefore.minus(exitFee).minus(gasCost).toFixed()
      );
    });

    it("buyback_reserve = (total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply.", async () => {
      const buybackReserve = new BigNumber(
        await contracts.dat.buybackReserve()
      );
      assert.equal(
        buybackReserve.toFixed(),
        buybackReserveBefore.plus(exitFee).toFixed()
      );
    });
  });

  it("should fail if send less than exitFee.", async () => {
    const exitFee = new BigNumber(await contracts.dat.estimateExitFee(0));
    await reverts(
      contracts.dat.close({
        from: await contracts.dat.beneficiary(),
        value: exitFee.minus(1).toFixed(),
      }),
      "SafeMath: subtraction overflow"
    );
  });

  describe("when sending too much", () => {
    let beneficiaryBalanceBefore;
    let exitFee;
    let gasCost;

    beforeEach(async () => {
      beneficiaryBalanceBefore = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      exitFee = new BigNumber(await contracts.dat.estimateExitFee(0));
      const tx = await contracts.dat.close({
        from: await contracts.dat.beneficiary(),
        value: exitFee.plus(web3.utils.toWei("1", "ether")).toFixed(),
      });
      gasCost = await getGasCost(tx);
    });

    it("the remainder was refunded", async () => {
      const balance = new BigNumber(
        await web3.eth.getBalance(await contracts.dat.beneficiary())
      );
      assert.equal(
        balance.toFixed(),
        beneficiaryBalanceBefore.minus(exitFee).minus(gasCost).toFixed()
      );
    });
  });

  describe("when reserve is high", () => {
    beforeEach(async () => {
      // Redeploy using an ERC-20
      const token = await tokens.sai.deploy(web3, accounts[0]);
      contracts = await deployDat(accounts, { currency: token.address });
      await approveAll(contracts, accounts);
      await token.mint(contracts.dat.address, constants.MAX_UINT, {
        from: accounts[0],
      });
    });

    it("exitFee is 0", async () => {
      const exitFee = new BigNumber(await contracts.dat.estimateExitFee(0));
      assert.equal(exitFee, 0);
    });
  });
});
