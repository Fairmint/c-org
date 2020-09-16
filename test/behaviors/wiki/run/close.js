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
          value: "100000000000000000000000",
        }),
        "BENEFICIARY_ONLY"
      );
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
        if (this.contract.estimateExitFee) {
          exitFee = new BigNumber(await this.contract.estimateExitFee(0));
        } else {
          exitFee = new BigNumber("0");
        }
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
      if (this.contract.estimateExitFee) {
        const exitFee = new BigNumber(
          await this.contract.estimateExitFee(0)
        ).minus(1);
        await expectRevert(
          this.contract.close({
            from: await this.contract.beneficiary(),
            value: exitFee.toFixed(),
          }),
          "SafeMath: subtraction overflow"
        );
      }
    });

    describe("when sending too much", function () {
      let beneficiaryBalanceBefore;
      let exitFee;
      let gasCost;

      beforeEach(async function () {
        if (this.contract.estimateExitFee) {
          beneficiaryBalanceBefore = new BigNumber(
            await web3.eth.getBalance(await this.contract.beneficiary())
          );
          exitFee = new BigNumber(await this.contract.estimateExitFee(0));
          const tx = await this.contract.close({
            from: await this.contract.beneficiary(),
            value: exitFee.plus(web3.utils.toWei("1", "ether")).toFixed(),
          });
          gasCost = await getGasCost(tx);
        }
      });

      it("the remainder was refunded", async function () {
        if (this.contract.estimateExitFee) {
          const balance = new BigNumber(
            await web3.eth.getBalance(await this.contract.beneficiary())
          );
          assert.equal(
            balance.toFixed(),
            beneficiaryBalanceBefore.minus(exitFee).minus(gasCost).toFixed()
          );
        }
      });
    });
  });
};
