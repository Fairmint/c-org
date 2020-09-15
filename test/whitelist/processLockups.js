const BigNumber = require("bignumber.js");
const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { time } = require("@openzeppelin/test-helpers");

contract("whitelist / processLockups", (accounts) => {
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
    const currentTime = new BigNumber(await time.latest());
    await contracts.whitelist.addLockups(
      [trader],
      [currentTime.plus(5).toFixed()],
      [42],
      {
        from: operatorAccount,
      }
    );
  });

  it("anyone can processLockups", async () => {
    await time.increase(6);
    await contracts.whitelist.processLockups(trader, -1, {
      from: accounts[8],
    });
  });

  it("should fail to for a userId that does not exist", async () => {
    await expectRevert(
      contracts.whitelist.processLockups(accounts[8], -1, {
        from: accounts[8],
      }),
      "USER_ID_UNKNOWN"
    );
  });

  it("sanity check: has 1 lockup", async () => {
    const {
      jurisdictionId,
      totalTokensLocked,
      startIndex,
      endIndex,
    } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
    assert.equal(jurisdictionId, 4);
    assert.equal(totalTokensLocked.toString(), 42);
    assert.equal(startIndex, 0);
    assert.equal(endIndex, 1);
  });

  describe("on processLockups", () => {
    beforeEach(async () => {
      await time.increase(6);
      await contracts.whitelist.processLockups(trader, -1, {
        from: accounts[8],
      });
    });

    it("has no more lockup", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex,
      } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked.toString(), 0);
      assert.equal(startIndex, 1);
      assert.equal(endIndex, 1);
    });

    describe("process many lockups", () => {
      // 100 costs 1m; 200 2m; 300 3m; 400 reverts
      const readyToFreeCount = 800;
      const maxToFreePerLoop = 300;
      const notReadToFreeCount = 10;

      beforeEach(async () => {
        const currentTime = new BigNumber(await time.latest());
        let lockupTime = currentTime.plus(5).toNumber();
        for (let i = 0; i < readyToFreeCount + notReadToFreeCount; i++) {
          if (i == readyToFreeCount) {
            // Move the expiration to far in the future
            lockupTime += 10000;
          }
          await contracts.whitelist.addLockups([trader], [lockupTime++], [42], {
            from: operatorAccount,
          });
        }
      });

      it("has lots of lockups", async () => {
        const {
          jurisdictionId,
          totalTokensLocked,
          startIndex,
          endIndex,
        } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
        assert.equal(jurisdictionId, 4);
        assert.equal(
          totalTokensLocked.toString(),
          42 * (readyToFreeCount + notReadToFreeCount)
        );
        assert.equal(startIndex, 1);
        assert.equal(endIndex, 1 + readyToFreeCount + notReadToFreeCount);
      });

      it("before processing transferable token count is correct", async () => {
        await time.increase(5 + readyToFreeCount);
        // mine a block to update the ganache time
        await web3.eth.sendTransaction({
          from: accounts[0],
          to: accounts[1],
          value: 1,
        });

        let lockedTokens = await contracts.whitelist.getLockedTokenCount(
          trader
        );
        assert.equal(lockedTokens.toString(), 42 * notReadToFreeCount);
        const price = web3.utils.toWei("1000000", "ether");
        await contracts.dat.buy(trader, price, 1, {
          from: trader,
          value: price,
        });
        lockedTokens = await contracts.whitelist.getLockedTokenCount(trader);
        assert.equal(lockedTokens.toString(), 42 * notReadToFreeCount);
        assert.notEqual(lockedTokens, 0);
      });

      describe("after process", () => {
        beforeEach(async () => {
          await time.increase(5 + readyToFreeCount);
          for (let i = 0; i < 5; i++) {
            await contracts.whitelist.processLockups(trader, maxToFreePerLoop, {
              from: accounts[8],
            });
          }
        });

        it("most lockups were freed", async () => {
          const {
            jurisdictionId,
            totalTokensLocked,
            startIndex,
            endIndex,
          } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
          assert.equal(jurisdictionId, 4);
          assert.equal(totalTokensLocked.toString(), 42 * notReadToFreeCount);
          assert.equal(startIndex, 1 + readyToFreeCount);
          assert.equal(endIndex, 1 + readyToFreeCount + notReadToFreeCount);
        });
      });
    });
  });
});
