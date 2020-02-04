const { approveAll, deployDat } = require("../helpers");

contract("dat / whitelist / readOnly", accounts => {
  let contracts;
  let control;

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    control = await contracts.dat.control();
  });

  it("callingContract", async () => {
    const callingContract = await contracts.whitelist.callingContract();
    assert.equal(callingContract, contracts.dat.address);
    assert.notEqual(callingContract, web3.utils.padLeft(0, 40));
  });

  it("startDate default", async () => {
    const startDate = await contracts.whitelist.startDate();
    assert.equal(startDate, 0);
  });

  it("lockupGranularity default", async () => {
    const lockupGranularity = await contracts.whitelist.lockupGranularity();
    assert.equal(lockupGranularity, 0);
  });

  describe("after config", () => {
    beforeEach(async () => {
      await contracts.whitelist.configWhitelist(42, 84, {
        from: control
      });
    });

    it("startDate updated", async () => {
      const startDate = await contracts.whitelist.startDate();
      assert.equal(startDate, 42);
    });

    it("lockupGranularity updated", async () => {
      const lockupGranularity = await contracts.whitelist.lockupGranularity();
      assert.equal(lockupGranularity, 84);
    });
  });

  it("getJurisdictionFlow default", async () => {
    const accepted = await contracts.whitelist.getJurisdictionFlow(42, 1);
    assert.equal(accepted, 0);
  });

  describe("after updateJurisdictionFlows", () => {
    beforeEach(async () => {
      await contracts.whitelist.updateJurisdictionFlows(
        [42, 43],
        [1, 2],
        [1, 1],
        {
          from: control
        }
      );
    });

    it("getJurisdictionFlow updated 1", async () => {
      const accepted = await contracts.whitelist.getJurisdictionFlow(42, 1);
      assert.equal(accepted, 1);
    });

    it("getJurisdictionFlow updated 1", async () => {
      const accepted = await contracts.whitelist.getJurisdictionFlow(43, 2);
      assert.equal(accepted, 1);
    });

    it("getJurisdictionFlow is single directional", async () => {
      const accepted = await contracts.whitelist.getJurisdictionFlow(1, 42);
      assert.equal(accepted, 0);
    });

    it("getJurisdictionFlow wires not crossed", async () => {
      const accepted = await contracts.whitelist.getJurisdictionFlow(43, 1);
      assert.equal(accepted, 0);
    });

    describe("after updateJurisdictionFlows to clear entries", () => {
      beforeEach(async () => {
        await contracts.whitelist.updateJurisdictionFlows([42], [1], [0], {
          from: control
        });
      });

      it("getJurisdictionFlow updated", async () => {
        const accepted = await contracts.whitelist.getJurisdictionFlow(42, 1);
        assert.equal(accepted, 0);
      });
    });
  });

  it("authorizedWalletToUserId default", async () => {
    const userId = await contracts.whitelist.authorizedWalletToUserId(
      accounts[4]
    );
    assert.equal(userId, web3.utils.padLeft(0, 40));
  });

  describe("after approveNewUsers", () => {
    beforeEach(async () => {
      await contracts.whitelist.approveNewUsers(
        [accounts[4], accounts[5]],
        [4, 5],
        {
          from: control
        }
      );
    });

    it("authorizedWalletToUserId updated 1", async () => {
      const userId = await contracts.whitelist.authorizedWalletToUserId(
        accounts[4]
      );
      assert.equal(userId, accounts[4]);
    });

    it("authorizedWalletToUserId updated 2", async () => {
      const userId = await contracts.whitelist.authorizedWalletToUserId(
        accounts[5]
      );
      assert.equal(userId, accounts[5]);
    });

    describe("after addApprovedUserWallets", () => {
      beforeEach(async () => {
        await contracts.whitelist.addApprovedUserWallets(
          [accounts[4], accounts[4]],
          [accounts[6], accounts[7]],
          {
            from: control
          }
        );
      });

      it("authorizedWalletToUserId updated 1", async () => {
        const userId = await contracts.whitelist.authorizedWalletToUserId(
          accounts[6]
        );
        assert.equal(userId, accounts[4]);
      });

      it("authorizedWalletToUserId updated 2", async () => {
        const userId = await contracts.whitelist.authorizedWalletToUserId(
          accounts[7]
        );
        assert.equal(userId, accounts[4]);
      });
    });

    it("getAuthorizedUserIdInfo default no entry", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex
      } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[9]);
      assert.equal(jurisdictionId, 0);
      assert.equal(totalTokensLocked, 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("getAuthorizedUserIdInfo default entry", async () => {
      const {
        jurisdictionId,
        totalTokensLocked,
        startIndex,
        endIndex
      } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[4]);
      assert.equal(jurisdictionId, 4);
      assert.equal(totalTokensLocked, 0);
      assert.equal(startIndex, 0);
      assert.equal(endIndex, 0);
    });

    it("default getUserIdLockup", async () => {
      const {
        lockupExpirationDate,
        numberOfTokensLocked
      } = await contracts.whitelist.getUserIdLockup(accounts[4], 0);
      assert.equal(lockupExpirationDate, 0);
      assert.equal(numberOfTokensLocked, 0);
    });

    describe("after lockup", () => {
      let expectedTokens;

      beforeEach(async () => {
        await contracts.whitelist.updateJurisdictionFlows(
          [1, 1],
          [4, 5],
          [100000000, 100000000],
          {
            from: control
          }
        );
        const price = web3.utils.toWei("100", "ether");
        expectedTokens = await contracts.dat.estimateBuyValue(price);
        await contracts.dat.buy(accounts[4], price, 1, {
          from: accounts[4],
          value: price
        });
      });

      it("getAuthorizedUserIdInfo updated", async () => {
        const {
          jurisdictionId,
          totalTokensLocked,
          startIndex,
          endIndex
        } = await contracts.whitelist.getAuthorizedUserIdInfo(accounts[4]);
        assert.equal(jurisdictionId, 4);
        assert.equal(totalTokensLocked.toString(), expectedTokens.toString());
        assert.equal(startIndex, 0);
        assert.equal(endIndex, 1);
      });

      it("getUserIdLockup updated", async () => {
        const {
          lockupExpirationDate,
          numberOfTokensLocked
        } = await contracts.whitelist.getUserIdLockup(accounts[4], 0);
        assert.notEqual(lockupExpirationDate, 0);
        assert.equal(
          numberOfTokensLocked.toString(),
          expectedTokens.toString()
        );
      });
    });
  });
});
