const BigNumber = require("bignumber.js");
const { deployDat } = require("../datHelpers");
const { reverts } = require("truffle-assertions");
const { time } = require("@openzeppelin/test-helpers");

contract("whitelist / addLockups", (accounts) => {
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
    const currentTime = new BigNumber(await time.latest());
    await reverts(
      contracts.whitelist.addLockups(
        [trader],
        [currentTime.plus(1000).toFixed()],
        [4],
        {
          from: accounts[9],
        }
      ),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("operators can addLockup", async () => {
    const currentTime = new BigNumber(await time.latest());
    await contracts.whitelist.addLockups(
      [trader],
      [currentTime.plus(1000).toFixed()],
      [4],
      {
        from: operatorAccount,
      }
    );
  });

  it("cannot addLockup for an unknown user id", async () => {
    const currentTime = new BigNumber(await time.latest());
    await reverts(
      contracts.whitelist.addLockups(
        [accounts[9]],
        [currentTime.plus(1000).toFixed()],
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
      const currentTime = new BigNumber(await time.latest());
      await contracts.whitelist.addLockups(
        [trader],
        [currentTime.plus(1000).toFixed()],
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
      const currentTime = new BigNumber(await time.latest());
      await contracts.whitelist.addLockups(
        [trader],
        [currentTime.minus(1).toFixed()],
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
      const currentTime = new BigNumber(await time.latest());
      locked1Expiration = currentTime.plus(20);
      await contracts.whitelist.addLockups(
        [trader],
        [locked1Expiration.toFixed()],
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
      assert.equal(
        lockupExpirationDate.toString(),
        locked1Expiration.toFixed()
      );
      assert.equal(numberOfTokensLocked.toString(), locked1Count);
    });

    describe("adding another lockup with 0 granularity", () => {
      let locked2Expiration;
      let locked2Count = 99;

      beforeEach(async () => {
        locked2Expiration = locked1Expiration.plus(20);
        await contracts.whitelist.addLockups(
          [trader],
          [locked2Expiration.toFixed()],
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
        assert.equal(
          lockupExpirationDate.toString(),
          locked1Expiration.toFixed()
        );
        assert.equal(numberOfTokensLocked.toString(), locked1Count);
      });

      it("getUserIdLockup 1 updated", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked,
        } = await contracts.whitelist.getUserIdLockup(trader, 1);
        assert.equal(
          lockupExpirationDate.toString(),
          locked2Expiration.toFixed()
        );
        assert.equal(numberOfTokensLocked, locked2Count);
      });
    });

    describe("adding another lockup within granularity", () => {
      let locked2Expiration;
      let locked2Count = 99;

      beforeEach(async () => {
        locked2Expiration = locked1Expiration.plus(2000);
        await contracts.whitelist.configWhitelist(0, 2000, {
          from: ownerAccount,
        });
        await contracts.whitelist.addLockups(
          [trader],
          [locked2Expiration.toFixed()],
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
        assert.equal(startIndex.toString(), 0);
        assert.equal(endIndex.toString(), 1); // not changed
      });

      it("getUserIdLockup 0 updated", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked,
        } = await contracts.whitelist.getUserIdLockup(trader, 0);
        assert.equal(
          lockupExpirationDate.toString(),
          locked1Expiration.toFixed()
        );
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
          locked3Expiration = locked2Expiration.plus(1);
          await contracts.whitelist.addLockups(
            [trader],
            [locked3Expiration.toFixed()],
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
          assert.equal(
            lockupExpirationDate.toString(),
            locked1Expiration.toFixed()
          );
          assert.equal(numberOfTokensLocked, locked1Count + locked2Count);
        });

        it("getUserIdLockup 1 updated", async () => {
          const {
            lockupExpirationDate,
            numberOfTokensLocked,
          } = await contracts.whitelist.getUserIdLockup(trader, 1);
          assert.equal(
            lockupExpirationDate.toString(),
            locked3Expiration.toFixed()
          );
          assert.equal(numberOfTokensLocked, locked3Count);
        });
      });
    });
  });
});
