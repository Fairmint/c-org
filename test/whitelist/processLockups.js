const BigNumber = require("bignumber.js");
const { deployDat } = require("../helpers");

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

contract("dat / whitelist / processLockups", accounts => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[3];
  let trader = accounts[7];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount
    });
    await contracts.whitelist.approveNewUsers([trader], [4], {
      from: operatorAccount
    });
    await contracts.whitelist.addLockups(
      [trader],
      [Math.round(Date.now() / 1000) + 5],
      [42],
      {
        from: operatorAccount
      }
    );
  });

  it("anyone can processLockups", async () => {
    await sleep(6000);
    await contracts.whitelist.processLockups(trader, -1, {
      from: accounts[8]
    });
  });

  it("anyone can processLockups for a userId that does not exist", async () => {
    await contracts.whitelist.processLockups(accounts[8], -1, {
      from: accounts[8]
    });
  });

  it("sanity check: has 1 lockup", async () => {
    const {
      jurisdictionId,
      totalTokensLocked,
      startIndex,
      endIndex
    } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
    assert.equal(jurisdictionId, 4);
    assert.equal(totalTokensLocked.toString(), 42);
    assert.equal(startIndex, 0);
    assert.equal(endIndex, 1);
  });

  describe("on processLockups", () => {
    beforeEach(async () => {
      await sleep(6000);
      await contracts.whitelist.processLockups(trader, -1, {
        from: accounts[8]
      });
    });

    it("has no more lockup", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex
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
        let lockupTime = Math.round(Date.now() / 1000) + 5;
        for (let i = 0; i < readyToFreeCount + notReadToFreeCount; i++) {
          if (i == readyToFreeCount) {
            // Move the expiration to far in the future
            lockupTime += 10000;
          }
          await contracts.whitelist.addLockups([trader], [lockupTime++], [42], {
            from: operatorAccount
          });
        }
      });

      it("has lots of lockups", async () => {
        const {
          jurisdictionId,
          totalTokensLocked,
          startIndex,
          endIndex
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
        await sleep((5 + readyToFreeCount) * 1000);
        // mine a block to update the ganache time
        await web3.eth.sendTransaction({
          from: accounts[0],
          to: accounts[1],
          value: 1
        });

        let lockedTokens = await contracts.whitelist.getLockedTokenCount(
          trader
        );
        assert.equal(lockedTokens.toString(), 42 * notReadToFreeCount);
        const price = web3.utils.toWei("1000000", "ether");
        await contracts.dat.buy(trader, price, 1, {
          from: trader,
          value: price
        });
        lockedTokens = await contracts.whitelist.getLockedTokenCount(trader);
        assert.equal(lockedTokens.toString(), 42 * notReadToFreeCount);
        assert.notEqual(lockedTokens, 0);
      });

      describe("after process", () => {
        beforeEach(async () => {
          await sleep((5 + readyToFreeCount) * 1000);
          for (let i = 0; i < 5; i++) {
            await contracts.whitelist.processLockups(trader, maxToFreePerLoop, {
              from: accounts[8]
            });
          }
        });

        it("most lockups were freed", async () => {
          const {
            jurisdictionId,
            totalTokensLocked,
            startIndex,
            endIndex
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
