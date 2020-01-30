const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / updateJurisdictionsForUserIds", accounts => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[2];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount
    });
    await contracts.whitelist.approveNewUsers([accounts[5]], [4], {
      from: operatorAccount
    });
  });

  it("non-operators cannot updateJurisdictionsForUserIds", async () => {
    await reverts(
      contracts.whitelist.updateJurisdictionsForUserIds([accounts[5]], [1], {
        from: accounts[9]
      }),
      "OperatorRole: caller does not have the Operator role"
    );
  });

  it("operators can updateJurisdictionsForUserIds", async () => {
    await contracts.whitelist.updateJurisdictionsForUserIds(
      [accounts[5]],
      [5],
      {
        from: operatorAccount
      }
    );
  });

  it("shouldFail to update an unknown entry", async () => {
    await reverts(
      contracts.whitelist.updateJurisdictionsForUserIds([accounts[6]], [1], {
        from: operatorAccount
      }),
      "USER_ID_UNKNOWN"
    );
  });

  it("shouldFail to update to an invalid jurisdiction", async () => {
    await reverts(
      contracts.whitelist.updateJurisdictionsForUserIds([accounts[5]], [0], {
        from: operatorAccount
      }),
      "INVALID_JURISDICTION_ID"
    );
  });

  describe("after updateJurisdictionsForUserIds", () => {
    beforeEach(async () => {
      await contracts.whitelist.updateJurisdictionsForUserIds(
        [accounts[5]],
        [42],
        {
          from: operatorAccount
        }
      );
      await contracts.whitelist.updateJurisdictionFlows(
        [42, 1],
        [1, 42],
        [true, true],
        {
          from: ownerAccount
        }
      );
    });

    it("getAuthorizedUserIdInfo updated", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex
      } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[5]);
      assert.equal(jurisdictionId, 42);
      assert.equal(totalTokensLocked, 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("can buy", async () => {
      await contracts.whitelist.updateLockupLengths(
        [4, 5, 42],
        [100000000, 100000000, 100000000],
        {
          from: await contracts.dat.control()
        }
      );
      const price = web3.utils.toWei("100", "ether");
      console.log(`${accounts[5]} buy`);
      await contracts.dat.buy(accounts[5], price, 1, {
        from: accounts[5],
        value: price
      });
    });

    describe("after lockup", () => {
      let expectedTokens;

      beforeEach(async () => {
        await contracts.whitelist.updateLockupLengths(
          [4, 5, 42],
          [100000000, 100000000, 100000000],
          {
            from: await contracts.dat.control()
          }
        );
        const price = web3.utils.toWei("100", "ether");
        expectedTokens = await contracts.dat.estimateBuyValue(price);
        await contracts.dat.buy(accounts[5], price, 1, {
          from: accounts[5],
          value: price
        });
      });

      it("getAuthorizedUserIdInfo updated", async () => {
        const {
          jurisdictionId,
          totalTokensLocked,
          startIndex,
          endIndex
        } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[5]);
        assert.equal(jurisdictionId, 42);
        assert.equal(totalTokensLocked.toString(), expectedTokens.toString());
        assert.equal(startIndex, 0);
        assert.equal(endIndex, 1);
      });

      it("getUserIdLockup updated", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked
        } = await contracts.whitelist.getUserIdLockup(accounts[5], 0);
        assert.notEqual(lockupExpirationDate, 0);
        assert.equal(
          numberOfTokensLocked.toString(),
          expectedTokens.toString()
        );
      });

      describe("after updateJurisdictionsForUserIds again", () => {
        beforeEach(async () => {
          await contracts.whitelist.updateJurisdictionsForUserIds(
            [accounts[5]],
            [69],
            {
              from: operatorAccount
            }
          );
        });

        it("getAuthorizedUserIdInfo information is not lost", async () => {
          const {
            jurisdictionId,
            totalTokensLocked,
            startIndex,
            endIndex
          } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[5]);
          assert.equal(jurisdictionId.toString(), 69);
          assert.equal(totalTokensLocked.toString(), expectedTokens.toString());
          assert.equal(startIndex, 0);
          assert.equal(endIndex, 1);
        });
      });
    });
  });
});
