const { constants, helpers } = require("hardlydifficult-eth");

// Original deployment used 2.0.8 for the DAT and 2.2.0 for the whitelist
const cOrgAbi220 = require("../../versions/2.2.0/abi.json");
const cOrgBytecode220 = require("../../versions/2.2.0/bytecode.json");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const proxyArtifact = artifacts.require("AdminUpgradeabilityProxy");
const proxyAdminArtifact = artifacts.require("ProxyAdmin");
const whitelistArtifact = artifacts.require("Whitelist");
const { updateDatConfig } = require("../../helpers");

contract("whitelist / upgrade", (accounts) => {
  const contracts = {};
  const [owner, trader, otherAccount] = accounts;

  beforeEach(async () => {
    const callOptions = {
      control: owner,
      initReserve: "42000000000000000000",
      currency: constants.ZERO_ADDRESS,
      initGoal: "0",
      buySlopeNum: "1",
      buySlopeDen: "100000000000000000000",
      investmentReserveBasisPoints: "1000",
      revenueCommitmentBasisPoints: "1000",
      beneficiary: accounts[0],
      feeCollector: accounts.length > 2 ? accounts[2] : accounts[0],
      setupFee: 0,
      setupFeeRecipient: constants.ZERO_ADDRESS,
      name: "Test org",
      symbol: "TFO",
    };

    // ProxyAdmin
    contracts.proxyAdmin = await proxyAdminArtifact.new({
      from: callOptions.control,
    });

    const datContract = await datArtifact.new({
      from: callOptions.control,
    });

    let datProxy;
    datProxy = await proxyArtifact.new(
      datContract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control,
      }
    );

    contracts.dat = await datArtifact.at(datProxy.address);

    await contracts.dat.initialize(
      callOptions.initReserve,
      callOptions.currency,
      callOptions.initGoal,
      callOptions.buySlopeNum,
      callOptions.buySlopeDen,
      callOptions.investmentReserveBasisPoints,
      callOptions.setupFee,
      callOptions.setupFeeRecipient,
      callOptions.name,
      callOptions.symbol,
      { from: callOptions.control, gas: constants.MAX_GAS }
    );

    let promises = [];
    // Whitelist
    let whitelistProxy;
    const originalWhitelistContract = new web3.eth.Contract(
      cOrgAbi220.whitelist
    );
    const originalWhitelist = await originalWhitelistContract
      .deploy({
        data: cOrgBytecode220.whitelist,
      })
      .send({
        from: callOptions.control,
        gas: constants.MAX_GAS,
      });
    whitelistProxy = await proxyArtifact.new(
      originalWhitelist._address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control,
      }
    );

    contracts.whitelist = new web3.eth.Contract(
      cOrgAbi220.whitelist,
      whitelistProxy.address
    );

    await contracts.whitelist.methods.initialize(contracts.dat.address).send({
      from: callOptions.control,
      gas: constants.MAX_GAS,
    });
    await contracts.whitelist.methods.configWhitelist(1234, 42).send({
      from: callOptions.control,
    });
    contracts.whitelist = await helpers.truffleContract.at(
      web3,
      cOrgAbi220.whitelist,
      whitelistProxy.address
    );
    callOptions.whitelistAddress = contracts.whitelist.address;

    promises.push(
      contracts.whitelist.updateJurisdictionFlows(
        [1, 4, 4],
        [4, 1, 4],
        [100000000, 1, 1],
        {
          from: callOptions.control,
        }
      )
    );

    promises.push(
      contracts.whitelist.approveNewUsers([callOptions.control], [4], {
        from: callOptions.control,
      })
    );
    if (callOptions.control != callOptions.beneficiary) {
      promises.push(
        contracts.whitelist.approveNewUsers([callOptions.beneficiary], [4], {
          from: callOptions.control,
        })
      );
    }
    if (
      callOptions.feeCollector != callOptions.control &&
      callOptions.feeCollector != callOptions.beneficiary
    ) {
      promises.push(
        contracts.whitelist.approveNewUsers([callOptions.feeCollector], [4], {
          from: callOptions.control,
        })
      );
    }
    promises.push(
      contracts.whitelist.approveNewUsers([web3.utils.padLeft(0, 40)], [1], {
        from: callOptions.control,
      })
    );
    promises.push(
      contracts.whitelist.approveNewUsers([trader], [4], {
        from: callOptions.control,
      })
    );

    // Update DAT (with new AUTH and other callOptions)
    promises.push(updateDatConfig(contracts, callOptions));
    await Promise.all(promises);

    const value = "100000000000000000000";
    await contracts.dat.buy(trader, value, 1, {
      from: trader,
      value,
    });

    await contracts.whitelist.forceUnlock(trader, 1, {
      from: callOptions.control,
    });

    await contracts.dat.buy(trader, value, 1, {
      from: trader,
      value,
    });
  });

  describe("on upgrade", () => {
    /* All data from the original version
  IERC20 public callingContract;
  uint public startDate;
  uint public lockupGranularity;
  mapping(uint => mapping(uint => uint)) internal jurisdictionFlows;
  mapping(address => address) public authorizedWalletToUserId;
  struct UserInfo
  {
    // The user's current jurisdictionId or 0 for unknown (the default)
    uint jurisdictionId;
    // The number of tokens locked, with details tracked in userIdLockups
    uint totalTokensLocked;
    // The first applicable entry in userIdLockups
    uint startIndex;
    // The last applicable entry in userIdLockups + 1
    uint endIndex;
  }
  mapping(address => UserInfo) internal authorizedUserIdInfo;
  struct Lockup
  {
    // The date/time that this lockup entry has expired and the tokens may be transferred
    uint lockupExpirationDate;
    // How many tokens locked until the given expiration date.
    uint numberOfTokensLocked;
  }
  mapping(address => mapping(uint => Lockup)) internal userIdLockups;
     */
    let callingContractBefore;
    let startDateBefore;
    let lockupGranularityBefore;
    let jurisdictionFlow44Before;
    let jurisdictionFlow41Before;
    let authorizedWalletToUserIdTraderBefore;
    let authorizedWalletToUserIdOtherBefore;
    let authorizedUserIdInfoJurisdictionIdBefore;
    let authorizedUserIdInfoTotalTokensLockedBefore;
    let authorizedUserIdInfoStartIndexBefore;
    let authorizedUserIdInfoEndIndexBefore;
    let userIdLockupsLockupExpirationDateBefore;
    let userIdLockupsNumberOfTokensLockedBefore;

    beforeEach(async () => {
      callingContractBefore = await contracts.whitelist.callingContract();
      startDateBefore = await contracts.whitelist.startDate();
      lockupGranularityBefore = await contracts.whitelist.lockupGranularity();
      jurisdictionFlow44Before = await contracts.whitelist.getJurisdictionFlow(
        4,
        4
      );
      jurisdictionFlow41Before = await contracts.whitelist.getJurisdictionFlow(
        4,
        1
      );
      authorizedWalletToUserIdTraderBefore = await contracts.whitelist.authorizedWalletToUserId(
        trader
      );
      authorizedWalletToUserIdOtherBefore = await contracts.whitelist.authorizedWalletToUserId(
        otherAccount
      );
      const userIdInfo = await contracts.whitelist.getAuthorizedUserIdInfo(
        trader
      );
      authorizedUserIdInfoJurisdictionIdBefore = userIdInfo.jurisdictionId;
      authorizedUserIdInfoTotalTokensLockedBefore =
        userIdInfo.totalTokensLocked;
      authorizedUserIdInfoStartIndexBefore = userIdInfo.startIndex;
      authorizedUserIdInfoEndIndexBefore = userIdInfo.endIndex;
      const lockup = await contracts.whitelist.getUserIdLockup(trader, 1);
      userIdLockupsLockupExpirationDateBefore = lockup.lockupExpirationDate;
      userIdLockupsNumberOfTokensLockedBefore = lockup.numberOfTokensLocked;
    });

    it("has non-zero values", async () => {
      assert.notEqual(callingContractBefore.toString(), "0");
      assert.notEqual(startDateBefore.toString(), "0");
      assert.notEqual(lockupGranularityBefore.toString(), "0");
      assert.notEqual(jurisdictionFlow44Before.toString(), "0");
      assert.notEqual(jurisdictionFlow41Before.toString(), "0");
      assert.notEqual(authorizedWalletToUserIdTraderBefore.toString(), "0");
      assert.notEqual(authorizedWalletToUserIdOtherBefore.toString(), "0");
      assert.notEqual(authorizedUserIdInfoJurisdictionIdBefore.toString(), "0");
      assert.notEqual(
        authorizedUserIdInfoTotalTokensLockedBefore.toString(),
        "0"
      );
      assert.notEqual(authorizedUserIdInfoStartIndexBefore.toString(), "0");
      assert.notEqual(authorizedUserIdInfoEndIndexBefore.toString(), "0");
      assert.notEqual(userIdLockupsLockupExpirationDateBefore.toString(), "0");
      assert.notEqual(userIdLockupsNumberOfTokensLockedBefore.toString(), "0");
    });

    describe("after upgrade", async () => {
      beforeEach(async () => {
        const whitelistContract = await whitelistArtifact.new({
          from: owner,
        });
        await contracts.proxyAdmin.upgrade(
          contracts.whitelist.address,
          whitelistContract.address,
          {
            from: owner,
          }
        );
        contracts.whitelist = await whitelistArtifact.at(
          contracts.whitelist.address
        );
      });

      it("data has not changed", async () => {
        const callingContract = await contracts.whitelist.callingContract();
        assert.equal(callingContract, callingContractBefore);
        const startDate = await contracts.whitelist.startDate();
        assert.equal(startDate.toString(), startDateBefore.toString());
        const lockupGranularity = await contracts.whitelist.lockupGranularity();
        assert.equal(
          lockupGranularity.toString(),
          lockupGranularityBefore.toString()
        );
        const jurisdictionFlow44 = await contracts.whitelist.getJurisdictionFlow(
          4,
          4
        );
        assert.equal(
          jurisdictionFlow44.toString(),
          jurisdictionFlow44Before.toString()
        );
        const jurisdictionFlow41 = await contracts.whitelist.getJurisdictionFlow(
          4,
          1
        );
        assert.equal(
          jurisdictionFlow41.toString(),
          jurisdictionFlow41Before.toString()
        );
        const authorizedWalletToUserIdTrader = await contracts.whitelist.authorizedWalletToUserId(
          trader
        );
        assert.equal(
          authorizedWalletToUserIdTrader.toString(),
          authorizedWalletToUserIdTraderBefore.toString()
        );
        const authorizedWalletToUserIdOther = await contracts.whitelist.authorizedWalletToUserId(
          otherAccount
        );
        assert.equal(
          authorizedWalletToUserIdOther.toString(),
          authorizedWalletToUserIdOtherBefore.toString()
        );
        const userIdInfo = await contracts.whitelist.getAuthorizedUserIdInfo(
          trader
        );
        const authorizedUserIdInfoJurisdictionId = userIdInfo.jurisdictionId;
        assert.equal(
          authorizedUserIdInfoJurisdictionId.toString(),
          authorizedUserIdInfoJurisdictionIdBefore.toString()
        );
        const authorizedUserIdInfoTotalTokensLocked =
          userIdInfo.totalTokensLocked;
        assert.equal(
          authorizedUserIdInfoTotalTokensLocked.toString(),
          authorizedUserIdInfoTotalTokensLockedBefore.toString()
        );
        const authorizedUserIdInfoStartIndex = userIdInfo.startIndex;
        assert.equal(
          authorizedUserIdInfoStartIndex.toString(),
          authorizedUserIdInfoStartIndexBefore.toString()
        );
        const authorizedUserIdInfoEndIndex = userIdInfo.endIndex;
        assert.equal(
          authorizedUserIdInfoEndIndex.toString(),
          authorizedUserIdInfoEndIndexBefore.toString()
        );
        const lockup = await contracts.whitelist.getUserIdLockup(trader, 1);
        const userIdLockupsLockupExpirationDate = lockup.lockupExpirationDate;
        assert.equal(
          userIdLockupsLockupExpirationDate.toString(),
          userIdLockupsLockupExpirationDateBefore.toString()
        );
        const userIdLockupsNumberOfTokensLocked = lockup.numberOfTokensLocked;
        assert.equal(
          userIdLockupsNumberOfTokensLocked.toString(),
          userIdLockupsNumberOfTokensLockedBefore.toString()
        );
      });
    });
  });
});
