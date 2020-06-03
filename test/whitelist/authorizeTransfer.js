const BigNumber = require("bignumber.js");
const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

contract("dat / whitelist / authorizeTransfer", (accounts) => {
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
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(trader, price, 1, {
      from: trader,
      value: price,
    });
  });

  it("should fail if the from account is no longer whitelisted", async () => {
    await contracts.whitelist.revokeUserWallets([trader], {
      from: operatorAccount,
    });
    await reverts(
      contracts.dat.transfer(accounts[1], 1, {
        from: trader,
      }),
      "FROM_USER_UNKNOWN"
    );
  });

  it("detect transfer restriction if the from account is no longer whitelisted", async () => {
    await contracts.whitelist.revokeUserWallets([trader], {
      from: operatorAccount,
    });
    assert.equal(
      await contracts.whitelist.detectTransferRestriction(
        trader,
        accounts[1],
        1,
        {
          from: trader,
        }
      ),
      3
    );
  });

  it("owner cannot call authorizeTransfer directly", async () => {
    await reverts(
      contracts.whitelist.authorizeTransfer(
        accounts[0],
        accounts[0],
        0,
        false,
        { from: ownerAccount }
      ),
      "CALL_VIA_CONTRACT_ONLY"
    );
  });

  it("operator cannot call authorizeTransfer directly", async () => {
    await reverts(
      contracts.whitelist.authorizeTransfer(
        accounts[0],
        accounts[0],
        0,
        false,
        { from: ownerAccount }
      ),
      "CALL_VIA_CONTRACT_ONLY"
    );
  });

  describe("when blocked by jurisdiction flow", () => {
    beforeEach(async () => {
      await contracts.whitelist.updateJurisdictionsForUserIds([trader], [5], {
        from: operatorAccount,
      });
    });

    it("can still burn tokens", async () => {
      await contracts.dat.burn(1, { from: trader });
    });

    it("cannot buy", async () => {
      const price = web3.utils.toWei("100", "ether");
      await reverts(
        contracts.dat.buy(trader, price, 1, {
          from: trader,
          value: price,
        }),
        "DENIED: JURISDICTION_FLOW"
      );
    });

    it("cannot receive tokens from pay", async () => {
      const payAmount = web3.utils.toWei("100", "ether");
      const balanceBefore = await contracts.dat.balanceOf(trader);
      await contracts.dat.pay(payAmount, {
        from: trader,
        value: payAmount,
      });
      const balanceAfter = await contracts.dat.balanceOf(trader);
      assert.equal(balanceBefore.toString(), balanceAfter.toString());
      assert.notEqual(balanceBefore, 0);
    });

    it("cannot transfer: flow", async () => {
      await reverts(
        contracts.dat.transfer(accounts[1], 1, {
          from: trader,
        }),
        "DENIED: JURISDICTION_FLOW"
      );
    });

    it("cannot sell", async () => {
      await reverts(
        contracts.dat.sell(trader, 1, 1, {
          from: trader,
        }),
        "DENIED: JURISDICTION_FLOW"
      );
    });
  });

  describe("when no lockup applies", () => {
    beforeEach(async () => {
      const price = web3.utils.toWei("100", "ether");
      contracts.dat.buy(trader, price, 1, {
        from: trader,
        value: price,
      });
    });

    it("has no lockup", async () => {
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
  });

  describe("when lockup applies", () => {
    let tokenCount;

    beforeEach(async () => {
      await contracts.dat.burn(await contracts.dat.balanceOf(trader), {
        from: trader,
      });
      await contracts.whitelist.updateJurisdictionFlows([1], [4], [30], {
        from: ownerAccount,
      });
      const price = web3.utils.toWei("100", "ether");
      tokenCount = await contracts.dat.estimateBuyValue(price);
      contracts.dat.buy(trader, price, 1, {
        from: trader,
        value: price,
      });
    });

    it("has a lockup", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex,
      } = await contracts.whitelist.getAuthorizedUserIdInfo(trader);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked.toString(), tokenCount);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 1);
    });

    it("cannot transfer: lockup", async () => {
      await reverts(
        contracts.dat.transfer(accounts[1], 1, {
          from: trader,
        }),
        "INSUFFICIENT_TRANSFERABLE_BALANCE"
      );
    });

    describe("after unlock", async () => {
      beforeEach(async () => {
        await sleep(30000);
      });

      it("can transfer", async () => {
        await contracts.dat.transfer(accounts[1], 1, {
          from: trader,
        });
      });

      it("cannot transfer more than balance", async () => {
        await reverts(
          contracts.dat.transfer(accounts[1], "1000000000000000000000000", {
            from: trader,
          }),
          "INSUFFICIENT_BALANCE"
        );
      });

      describe("when partial lockup remains", () => {
        beforeEach(async () => {
          const price = web3.utils.toWei("100", "ether");
          await contracts.dat.buy(trader, price, 1, {
            from: trader,
            value: price,
          });
        });

        it("can transfer", async () => {
          await contracts.dat.transfer(accounts[1], 1, {
            from: trader,
          });
        });

        it("cannot transfer more than transferable balance", async () => {
          const balance = new BigNumber(
            await contracts.dat.balanceOf(trader)
          ).minus(100);
          await reverts(
            contracts.dat.transfer(accounts[1], balance.toFixed(), {
              from: trader,
            }),
            "INSUFFICIENT_TRANSFERABLE_BALANCE"
          );
        });
      });
    });
  });
});
