const BigNumber = require("bignumber.js");
const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { time } = require("@openzeppelin/test-helpers");
const WhitelistArtifact = artifacts.require("Whitelist");
contract("whitelist / authorizeTransfer", (accounts) => {
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
    await expectRevert(
      contracts.dat.transfer(accounts[1], 1, {
        from: trader,
      }),
      "USER_UNKNOWN"
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
    await expectRevert(
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
    await expectRevert(
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

  describe("when calling contract is not c-org and does not automatically activate wallets", async () => {
    let whitelist;
    beforeEach(async () => {
      whitelist = await WhitelistArtifact.new({ from: accounts[0] });
      await whitelist.initialize(accounts[1], { from: accounts[0] });
      await whitelist.updateJurisdictionFlows([1, 4, 4], [4, 1, 4], [1, 1, 1], {
        from: accounts[0],
      });
      await whitelist.addOperator(operatorAccount, { from: accounts[0] });
      await whitelist.approveNewUsers([accounts[4], accounts[7]], [4, 4], {
        from: accounts[0],
      });
    });

    it("should fail if _from is not registered to user", async () => {
      await whitelist.addApprovedUserWallets([accounts[4]], [accounts[5]], {
        from: accounts[0],
      });
      await expectRevert(
        whitelist.authorizeTransfer(accounts[6], accounts[5], 100, false, {
          from: accounts[1],
        }),
        "FROM_USER_UNKNOWN"
      );
    });

    it("should fail if _to is not registered to user", async () => {
      await whitelist.addApprovedUserWallets([accounts[4]], [accounts[5]], {
        from: accounts[0],
      });
      await expectRevert(
        whitelist.authorizeTransfer(accounts[5], accounts[6], 100, false, {
          from: accounts[1],
        }),
        "TO_USER_UNKNOWN"
      );
    });
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
      await expectRevert(
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
      await expectRevert(
        contracts.dat.transfer(accounts[1], 1, {
          from: trader,
        }),
        "DENIED: JURISDICTION_FLOW"
      );
    });

    it("cannot sell", async () => {
      await expectRevert(
        contracts.dat.sell(trader, "100000000", 1, {
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
      await contracts.dat.buy(trader, price, 1, {
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
      await expectRevert(
        contracts.dat.transfer(accounts[1], 1, {
          from: trader,
        }),
        "INSUFFICIENT_TRANSFERABLE_BALANCE"
      );
    });

    it("can sell: lockup", async () => {
      await contracts.dat.sell(trader, "100000000", 1, {
        from: trader,
      });
    });

    describe("after unlock", async () => {
      beforeEach(async () => {
        await time.increase(31);
      });

      it("can transfer", async () => {
        await contracts.dat.transfer(accounts[1], 1, {
          from: trader,
        });
      });

      it("cannot transfer more than balance", async () => {
        await expectRevert(
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
          await expectRevert(
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
