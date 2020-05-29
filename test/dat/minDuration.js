const { approveAll, deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");
const { constants } = require("hardlydifficult-eth");

contract("dat / minDuration", (accounts) => {
  let contracts;

  describe("deploy with initGoal", () => {
    beforeEach(async () => {
      contracts = await deployDat(accounts, { initGoal: 100 });
    });

    it("should fail to initialize from another account", async () => {
      await reverts(
        contracts.dat.initializeRunStartedOn(1, { from: accounts[0] }),
        "CONTROL_ONLY"
      );
    });

    it("should fail to initialize when in INIT", async () => {
      assert.equal(await contracts.dat.state(), 0);
      await reverts(
        contracts.dat.initializeRunStartedOn(1, {
          from: await contracts.dat.control(),
        }),
        "ONLY_CALL_IN_RUN"
      );
    });

    it("should fail to initialize when in CANCEL", async () => {
      await contracts.dat.close({ from: await contracts.dat.beneficiary() });
      assert.equal(await contracts.dat.state(), 3);
      await reverts(
        contracts.dat.initializeRunStartedOn(1, {
          from: await contracts.dat.control(),
        }),
        "ONLY_CALL_IN_RUN"
      );
    });
  });

  describe("deployed with upgrade", () => {
    beforeEach(async () => {
      contracts = await deployDat(accounts);
      await approveAll(contracts, accounts);
    });

    it("should fail to set the date in the future", async () => {
      await reverts(
        contracts.dat.initializeRunStartedOn(Date.now(), {
          from: await contracts.dat.control(),
        }),
        "DATE_MUST_BE_IN_PAST"
      );
    });

    describe("after initRunStartedOn", () => {
      beforeEach(async () => {
        await contracts.dat.initializeRunStartedOn(1, {
          from: await contracts.dat.control(),
        });
      });

      it("should fail to initialize again", async () => {
        await reverts(
          contracts.dat.initializeRunStartedOn(1, {
            from: await contracts.dat.control(),
          }),
          "ONLY_CALL_IF_NOT_AUTO_SET"
        );
      });
    });
  });

  describe("deployed without upgrade", () => {
    describe("without INIT_GOAL", () => {
      beforeEach(async () => {
        contracts = await deployDat(accounts, undefined, true, false);
        await approveAll(contracts, accounts);
      });

      it("should fail to initialize again", async () => {
        await reverts(
          contracts.dat.initializeRunStartedOn(1, {
            from: await contracts.dat.control(),
          }),
          "ONLY_CALL_IF_NOT_AUTO_SET"
        );
      });

      it("runStartedOn set if there is no INIT_GOAL", async () => {
        assert.notEqual(await contracts.dat.runStartedOn(), "0");
      });
    });

    describe("with INIT_GOAL", () => {
      beforeEach(async () => {
        contracts = await deployDat(
          accounts,
          { initGoal: web3.utils.toWei("100", "ether") },
          true,
          false
        );
        await approveAll(contracts, accounts);
      });

      it("runStartedOn defaults to 0", async () => {
        assert.equal(await contracts.dat.runStartedOn(), "0");
      });

      describe("after transition to RUN", () => {
        beforeEach(async () => {
          const value = web3.utils.toWei("1000", "ether");
          const trader = accounts[5];
          await contracts.dat.buy(trader, value, 1, { from: trader, value });
        });

        it("runStartedOn set when transitioning from INIT to RUN", async () => {
          assert.notEqual(await contracts.dat.runStartedOn(), "0");
        });
      });
    });
  });

  describe("deploy with max minDuration", () => {
    beforeEach(async () => {
      contracts = await deployDat(accounts, {
        minDuration: constants.MAX_UINT,
      });
    });

    it("If minDuration == -1 then close fails", async () => {
      await reverts(
        contracts.dat.close({
          from: await contracts.dat.beneficiary(),
          value: "10000000000000000000000",
        }),
        "MAY_NOT_CLOSE"
      );
    });
  });
});
