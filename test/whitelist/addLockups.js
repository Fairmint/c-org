const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / addLockups", (accounts) => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[3];
  let trader = accounts[7];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount,
    });
    await contracts.whitelist.approveNewUsers([trader], [4], {
      from: operatorAccount,
    });
  });

  it("non-operators cannot addLockup", async () => {
    await reverts(
      contracts.whitelist.addLockups(
        [trader],
        [Math.round(Date.now() / 1000) + 1000],
        [4],
        {
          from: accounts[9],
        }
      ),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("operators can addLockup", async () => {
    await contracts.whitelist.addLockups(
      [trader],
      [Math.round(Date.now() / 1000) + 1000],
      [4],
      {
        from: operatorAccount,
      }
    );
  });

  it("cannot addLockup for an unknown user id", async () => {
    await reverts(
      contracts.whitelist.addLockups(
        [accounts[9]],
        [Math.round(Date.now() / 1000) + 1000],
        [4],
        {
          from: operatorAccount,
        }
      ),
      "USER_ID_UNKNOWN"
    );
  });

  describe("adding 0 locked tokens", () => {
    beforeEach(async () => {
      await contracts.whitelist.addLockups(
        [trader],
        [Math.round(Date.now() / 1000) + 1000],
        [0],
        {
          from: operatorAccount,
        }
      );
    });

    it("getAuthorizedUserIdInfo not changed", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex,
      } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked.toString(), 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("getUserIdLockup not changed", async () => {
      const {
        lockupExpirationDate,
        numberOfTokensLocked,
      } = await contracts.whitelist.getUserIdLockup(trader, 0);
      assert.equal(lockupExpirationDate, 0);
      assert.equal(numberOfTokensLocked, 0);
    });
  });

  describe("adding an already expired lockup", () => {
    beforeEach(async () => {
      await contracts.whitelist.addLockups(
        [trader],
        [Math.round(Date.now() / 1000) - 1],
        [42],
        {
          from: operatorAccount,
        }
      );
    });

    it("getAuthorizedUserIdInfo not changed", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex,
      } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked.toString(), 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("getUserIdLockup not changed", async () => {
      const {
        lockupExpirationDate,
        numberOfTokensLocked,
      } = await contracts.whitelist.getUserIdLockup(trader, 0);
      assert.equal(lockupExpirationDate, 0);
      assert.equal(numberOfTokensLocked, 0);
    });
  });

  describe("adding a lockup", () => {
    let locked1Expiration;
    let locked1Count = 42;

    beforeEach(async () => {
      locked1Expiration = Math.round(Date.now() / 1000) + 20;
      await contracts.whitelist.addLockups(
        [trader],
        [locked1Expiration],
        [locked1Count],
        {
          from: operatorAccount,
        }
      );
    });

    it("getAuthorizedUserIdInfo updated", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex,
      } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked.toString(), locked1Count);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 1);
    });

    it("getUserIdLockup updated", async () => {
      const {
        lockupExpirationDate,
        numberOfTokensLocked,
      } = await contracts.whitelist.getUserIdLockup(trader, 0);
      assert.equal(lockupExpirationDate, locked1Expiration);
      assert.equal(numberOfTokensLocked, locked1Count);
    });

    describe("adding another lockup with 0 granularity", () => {
      let locked2Expiration;
      let locked2Count = 99;

      beforeEach(async () => {
        locked2Expiration = locked1Expiration + 20;
        await contracts.whitelist.addLockups(
          [trader],
          [locked2Expiration],
          [locked2Count],
          {
            from: operatorAccount,
          }
        );
      });

      it("getAuthorizedUserIdInfo updated", async () => {
        const {
          jurisdictionId,
          totalTokensLocked,
          startIndex,
          endIndex,
        } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
        assert.equal(jurisdictionId, 4);
        assert.equal(totalTokensLocked.toString(), locked1Count + locked2Count);
        assert.equal(startIndex, 0);
        assert.equal(endIndex, 2);
      });

      it("getUserIdLockup 0 not changed", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked,
        } = await contracts.whitelist.getUserIdLockup(trader, 0);
        assert.equal(lockupExpirationDate, locked1Expiration);
        assert.equal(numberOfTokensLocked, locked1Count);
      });

      it("getUserIdLockup 1 updated", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked,
        } = await contracts.whitelist.getUserIdLockup(trader, 1);
        assert.equal(lockupExpirationDate, locked2Expiration);
        assert.equal(numberOfTokensLocked, locked2Count);
      });
    });

    describe("adding another lockup within granularity", () => {
      let locked2Expiration;
      let locked2Count = 99;

      beforeEach(async () => {
        locked2Expiration = locked1Expiration + 2000;
        await contracts.whitelist.configWhitelist(0, 2000, {
          from: ownerAccount,
        });
        await contracts.whitelist.addLockups(
          [trader],
          [locked2Expiration],
          [locked2Count],
          {
            from: operatorAccount,
          }
        );
      });

      it("getAuthorizedUserIdInfo updated", async () => {
        const {
          jurisdictionId,
          totalTokensLocked,
          startIndex,
          endIndex,
        } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
        assert.equal(jurisdictionId, 4);
        assert.equal(totalTokensLocked.toString(), locked1Count + locked2Count);
        assert.equal(startIndex, 0);
        assert.equal(endIndex, 1); // not changed
      });

      it("getUserIdLockup 0 updated", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked,
        } = await contracts.whitelist.getUserIdLockup(trader, 0);
        assert.equal(lockupExpirationDate, locked1Expiration);
        assert.equal(
          numberOfTokensLocked.toString(),
          locked1Count + locked2Count
        );
      });

      it("getUserIdLockup 1 not defined", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked,
        } = await contracts.whitelist.getUserIdLockup(trader, 1);
        assert.equal(lockupExpirationDate, 0);
        assert.equal(numberOfTokensLocked, 0);
      });

      describe("adding another lockup after granularity window", () => {
        let locked3Expiration;
        let locked3Count = 99;

        beforeEach(async () => {
          locked3Expiration = locked2Expiration + 1;
          await contracts.whitelist.addLockups(
            [trader],
            [locked3Expiration],
            [locked3Count],
            {
              from: operatorAccount,
            }
          );
        });

        it("getAuthorizedUserIdInfo updated", async () => {
          const {
            jurisdictionId,
            totalTokensLocked,
            startIndex,
            endIndex,
          } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
          assert.equal(jurisdictionId, 4);
          assert.equal(
            totalTokensLocked.toString(),
            locked1Count + locked2Count + locked3Count
          );
          assert.equal(startIndex, 0);
          assert.equal(endIndex, 2);
        });

        it("getUserIdLockup 0 not changed", async () => {
          const {
            lockupExpirationDate,
            numberOfTokensLocked,
          } = await contracts.whitelist.getUserIdLockup(trader, 0);
          assert.equal(lockupExpirationDate, locked1Expiration);
          assert.equal(numberOfTokensLocked, locked1Count + locked2Count);
        });

        it("getUserIdLockup 1 updated", async () => {
          const {
            lockupExpirationDate,
            numberOfTokensLocked,
          } = await contracts.whitelist.getUserIdLockup(trader, 1);
          assert.equal(lockupExpirationDate, locked3Expiration);
          assert.equal(numberOfTokensLocked, locked3Count);
        });
      });
    });
  });
});
