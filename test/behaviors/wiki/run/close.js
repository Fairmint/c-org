const { tokens } = require("hardlydifficult-eth");
const { time } = require("@openzeppelin/test-helpers");

const BigNumber = require("bignumber.js");
const { constants, getGasCost } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (control, investor) {
  describe("Behavior / Wiki / Run / close", () => {
    it("Sanity check: state is run", async function () {
      const state = await this.contract.state();
      assert.equal(state.toString(), constants.STATE.RUN);
    });

    it("If address != beneficiary then the function exits.", async function () {
      await expectRevert(
        this.contract.close({
          from: investor,
          value: "10000000000000000000000",
        }),
        "BENEFICIARY_ONLY"
      );
    });

    describe("when locked", async function () {
      beforeEach(async function () {
        const currentTime = new BigNumber(await time.latest());
        await updateDatConfig(contracts, {
          minDuration: currentTime.plus(10).toFixed(),
        });
      });

      it("If now < minDuration then close fails", async function () {
        await expectRevert(
          this.contract.close({
            from: await this.contract.beneficiary(),
            value: "10000000000000000000000",
          }),
          "TOO_EARLY"
        );
      });

      describe("after the lock expires", function () {
        beforeEach(async function () {
          await time.increase(11);
        });

        it("then close works again", async function () {
          await this.contract.close({
            from: await this.contract.beneficiary(),
            value: "10000000000000000000000",
          });
        });
      });
    });

    describe("on close", function () {
      let beneficiaryBalanceBefore;
      let buybackReserveBefore;
      let exitFee;
      let gasCost;

      beforeEach(async function () {
        beneficiaryBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        buybackReserveBefore = new BigNumber(
          await this.contract.buybackReserve()
        );
        exitFee = new BigNumber(await this.contract.estimateExitFee(0));
        const tx = await this.contract.close({
          from: await this.contract.beneficiary(),
          value: exitFee.toFixed(),
        });
        gasCost = await getGasCost(tx);
      });

      it("Set state = 'close'", async function () {
        const state = await this.contract.state();
        assert.equal(state.toString(), constants.STATE.CLOSE);
      });

      it("substract (total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply - buyback_reserve from the balance of beneficiary.", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        assert.equal(
          balance.toFixed(),
          beneficiaryBalanceBefore.minus(exitFee).minus(gasCost).toFixed()
        );
      });

      it("buyback_reserve = (total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply.", async function () {
        const buybackReserve = new BigNumber(
          await this.contract.buybackReserve()
        );
        assert.equal(
          buybackReserve.toFixed(),
          buybackReserveBefore.plus(exitFee).toFixed()
        );
      });
    });

    it("should fail if send less than exitFee.", async function () {
      const exitFee = new BigNumber(await this.contract.estimateExitFee(0));
      await expectRevert(
        this.contract.close({
          from: await this.contract.beneficiary(),
          value: exitFee.minus(1).toFixed(),
        }),
        "SafeMath: subtraction overflow"
      );
    });

    describe("when sending too much", function () {
      let beneficiaryBalanceBefore;
      let exitFee;
      let gasCost;

      beforeEach(async function () {
        beneficiaryBalanceBefore = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        exitFee = new BigNumber(await this.contract.estimateExitFee(0));
        const tx = await this.contract.close({
          from: await this.contract.beneficiary(),
          value: exitFee.plus(web3.utils.toWei("1", "ether")).toFixed(),
        });
        gasCost = await getGasCost(tx);
      });

      it("the remainder was refunded", async function () {
        const balance = new BigNumber(
          await web3.eth.getBalance(await this.contract.beneficiary())
        );
        assert.equal(
          balance.toFixed(),
          beneficiaryBalanceBefore.minus(exitFee).minus(gasCost).toFixed()
        );
      });
    });

    describe("when reserve is high", function () {
      beforeEach(async function () {
        // Redeploy using an ERC-20
        const token = await tokens.sai.deploy(web3, control);
        contracts = await deployDat(accounts, { currency: token.address });
        await approveAll(contracts, accounts);
        await token.mint(this.contract.address, constants.MAX_UINT, {
          from: control,
        });
      });

      it("exitFee is 0", async function () {
        const exitFee = new BigNumber(await this.contract.estimateExitFee(0));
        assert.equal(exitFee, 0);
      });
    });
  });
};
