const { tokens, constants, helpers } = require("hardlydifficult-eth");

// Original deployment used 2.0.8 for the DAT and 2.2.0 for the whitelist
const cOrgAbi208 = require("../../versions/2.0.8/abi.json");
const cOrgBytecode208 = require("../../versions/2.0.8/bytecode.json");
const cOrgAbi220 = require("../../versions/2.2.0/abi.json");
const cOrgBytecode220 = require("../../versions/2.2.0/bytecode.json");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const proxyArtifact = artifacts.require("AdminUpgradeabilityProxy");
const proxyAdminArtifact = artifacts.require("ProxyAdmin");
const { updateDatConfig } = require("../../helpers");
const { approveAll } = require("../helpers");

contract("dat / upgrade", (accounts) => {
  const contracts = {};
  const [owner, trader, otherAccount] = accounts;

  beforeEach(async () => {
    const dai = await tokens.dai.deploy(web3, accounts[0]);
    const callOptions = {
      autoBurn: true,
      currency: dai.address,
      control: owner,
      feeBasisPoints: 987,
      initGoal: 9812398,
      openUntilAtLeast: 9182731982721,
      initReserve: "42000000000000000000",
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

    let datProxy;
    const originalDatContract = new web3.eth.Contract(cOrgAbi208.dat);
    const originalDat = await originalDatContract
      .deploy({
        data: cOrgBytecode208.dat,
      })
      .send({
        from: callOptions.control,
        gas: constants.MAX_GAS,
      });

    datProxy = await proxyArtifact.new(
      originalDat._address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control,
      }
    );

    contracts.dat = new web3.eth.Contract(cOrgAbi208.dat, datProxy.address);

    await contracts.dat.methods
      .initialize(
        callOptions.initReserve,
        callOptions.currency,
        callOptions.initGoal,
        callOptions.buySlopeNum,
        callOptions.buySlopeDen,
        callOptions.investmentReserveBasisPoints,
        callOptions.name,
        callOptions.symbol
      )
      .send({ from: callOptions.control, gas: constants.MAX_GAS });
    await contracts.dat.methods
      .initializePermit()
      .send({ from: callOptions.control, gas: constants.MAX_GAS });
    contracts.dat = await helpers.truffleContract.at(
      web3,
      cOrgAbi208.dat,
      datProxy.address
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
        [1, 1, 1],
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

    // Update DAT (with new AUTH and other callOptions)
    promises.push(updateDatConfig(contracts, callOptions));
    await Promise.all(promises);

    await approveAll(contracts, accounts);
    await dai.mint(trader, "99999999999999999999999999", { from: accounts[0] });
    await dai.approve(contracts.dat.address, -1, { from: trader });
    await contracts.dat.buy(trader, "100000000000000000000", 1, {
      from: trader,
    });
    await contracts.dat.approve(otherAccount, 7986234, { from: trader });
    await contracts.dat.burn(11289, { from: trader });
  });

  describe("on upgrade", () => {
    /* All data from the original version
  mapping (address => uint256) private _balances;
  mapping (address => mapping (address => uint256)) private _allowances;
  uint256 private _totalSupply;
  string private _name;
  string private _symbol;
  uint8 private _decimals;
  IWhitelist public whitelist;
  uint public burnedSupply;
  bool public autoBurn;
  address payable public beneficiary;
  uint public buySlopeNum;
  uint public buySlopeDen;
  address public control;
  IERC20 public currency;
  address payable public feeCollector;
  uint public feeBasisPoints;
  uint public initGoal;
  mapping(address => uint) public initInvestors;
  uint public initReserve;
  uint public investmentReserveBasisPoints;
  uint public openUntilAtLeast;
  uint public minInvestment;
  uint public revenueCommitmentBasisPoints;
  uint public state;
  string public constant version = "2";
  mapping (address => uint) public nonces;
  bytes32 public DOMAIN_SEPARATOR;
  bytes32 public constant PERMIT_TYPEHASH = 0xea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb;
     */
    let fairBalanceBefore;
    let fairAllowanceBefore;
    let totalSupplyBefore;
    let nameBefore;
    let symbolBefore;
    let decimalsBefore;
    let whitelistBefore;
    let burnedSupplyBefore;
    let autoBurnBefore;
    let beneficiaryBefore;
    let buySlopeNumBefore;
    let buySlopeDenBefore;
    let controlBefore;
    let currencyBefore;
    let feeCollectorBefore;
    let feeBasisPointsBefore;
    let initGoalBefore;
    let initInvestorBalanceBefore;
    let initReserveBefore;
    let investmentReserveBasisPointsBefore;
    let openUntilAtLeastBefore;
    let minInvestmentBefore;
    let revenueCommitmentBasisPointsBefore;
    let stateBefore;
    let versionBefore;
    let accountNonceBefore;
    let domainSeparatorBefore;
    let permitTypehashBefore;

    beforeEach(async () => {
      fairBalanceBefore = await contracts.dat.balanceOf(trader);
      fairAllowanceBefore = await contracts.dat.allowance(trader, otherAccount);
      totalSupplyBefore = await contracts.dat.totalSupply();
      nameBefore = await contracts.dat.name();
      symbolBefore = await contracts.dat.symbol();
      decimalsBefore = await contracts.dat.decimals();
      whitelistBefore = await contracts.dat.whitelist();
      burnedSupplyBefore = await contracts.dat.burnedSupply();
      autoBurnBefore = await contracts.dat.autoBurn();
      beneficiaryBefore = await contracts.dat.beneficiary();
      buySlopeNumBefore = await contracts.dat.buySlopeNum();
      buySlopeDenBefore = await contracts.dat.buySlopeDen();
      controlBefore = await contracts.dat.control();
      currencyBefore = await contracts.dat.currency();
      feeCollectorBefore = await contracts.dat.feeCollector();
      feeBasisPointsBefore = await contracts.dat.feeBasisPoints();
      initGoalBefore = await contracts.dat.initGoal();
      initInvestorBalanceBefore = await contracts.dat.initInvestors(trader);
      initReserveBefore = await contracts.dat.initReserve();
      investmentReserveBasisPointsBefore = await contracts.dat.investmentReserveBasisPoints();
      openUntilAtLeastBefore = await contracts.dat.openUntilAtLeast();
      minInvestmentBefore = await contracts.dat.minInvestment();
      revenueCommitmentBasisPointsBefore = await contracts.dat.revenueCommitmentBasisPoints();
      stateBefore = await contracts.dat.state();
      versionBefore = await contracts.dat.version();
      accountNonceBefore = await contracts.dat.nonces(trader);
      domainSeparatorBefore = await contracts.dat.DOMAIN_SEPARATOR();
      permitTypehashBefore = await contracts.dat.PERMIT_TYPEHASH();
    });

    it("has non-zero values", async () => {
      assert.notEqual(fairBalanceBefore.toString(), "0");
      assert.notEqual(fairAllowanceBefore.toString(), "0");
      assert.notEqual(totalSupplyBefore.toString(), "0");
      assert.notEqual(nameBefore, "");
      assert.notEqual(symbolBefore, "");
      assert.notEqual(decimalsBefore.toString(), "0");
      assert.notEqual(whitelistBefore, constants.ZERO_ADDRESS);
      assert.notEqual(burnedSupplyBefore.toString(), "0");
      assert.notEqual(autoBurnBefore, false);
      assert.notEqual(beneficiaryBefore, constants.ZERO_ADDRESS);
      assert.notEqual(buySlopeNumBefore.toString(), "0");
      assert.notEqual(buySlopeDenBefore.toString(), "0");
      assert.notEqual(controlBefore, constants.ZERO_ADDRESS);
      assert.notEqual(currencyBefore.toString(), "0");
      assert.notEqual(feeCollectorBefore, constants.ZERO_ADDRESS);
      assert.notEqual(feeBasisPointsBefore.toString(), "0");
      assert.notEqual(initGoalBefore.toString(), "0");
      assert.notEqual(initInvestorBalanceBefore.toString(), "0");
      assert.notEqual(initReserveBefore.toString(), "0");
      assert.notEqual(investmentReserveBasisPointsBefore.toString(), "0");
      assert.notEqual(openUntilAtLeastBefore.toString(), "0");
      assert.notEqual(minInvestmentBefore.toString(), "0");
      assert.notEqual(revenueCommitmentBasisPointsBefore.toString(), "0");
      assert.notEqual(stateBefore.toString(), "0");
      assert.notEqual(versionBefore, "");
      // TODO assert.notEqual(accountNonceBefore.toString(), "0");
      assert.notEqual(domainSeparatorBefore, web3.utils.padLeft(0, 64));
      assert.notEqual(permitTypehashBefore, web3.utils.padLeft(0, 64));
    });

    describe("after upgrade", async () => {
      beforeEach(async () => {
        const datContract = await datArtifact.new({
          from: await contracts.dat.control(),
        });
        await contracts.proxyAdmin.upgrade(
          contracts.dat.address,
          datContract.address,
          {
            from: await contracts.dat.control(),
          }
        );
        contracts.dat = await datArtifact.at(contracts.dat.address);
      });

      it("data has not changed", async () => {
        const fairBalance = await contracts.dat.balanceOf(trader);
        assert.equal(fairBalance.toString(), fairBalanceBefore.toString());
        const fairAllowance = await contracts.dat.allowance(
          trader,
          otherAccount
        );
        assert.equal(fairAllowanceBefore.toString(), fairAllowance.toString());
        const totalSupply = await contracts.dat.totalSupply();
        assert.equal(totalSupplyBefore.toString(), totalSupply.toString());
        const name = await contracts.dat.name();
        assert.equal(nameBefore, name);
        const symbol = await contracts.dat.symbol();
        assert.equal(symbolBefore, symbol);
        const decimals = await contracts.dat.decimals();
        assert.equal(decimalsBefore.toString(), decimals.toString());
        const whitelist = await contracts.dat.whitelist();
        assert.equal(whitelistBefore, whitelist);
        const burnedSupply = await contracts.dat.burnedSupply();
        assert.equal(burnedSupplyBefore.toString(), burnedSupply.toString());
        const autoBurn = await contracts.dat.autoBurn();
        assert.equal(autoBurnBefore, autoBurn);
        const beneficiary = await contracts.dat.beneficiary();
        assert.equal(beneficiaryBefore, beneficiary);
        const buySlopeNum = await contracts.dat.buySlopeNum();
        assert.equal(buySlopeNumBefore.toString(), buySlopeNum.toString());
        const buySlopeDen = await contracts.dat.buySlopeDen();
        assert.equal(buySlopeDenBefore.toString(), buySlopeDen.toString());
        const control = await contracts.dat.control();
        assert.equal(controlBefore, control);
        const currency = await contracts.dat.currency();
        assert.equal(currencyBefore, currency);
        const feeCollector = await contracts.dat.feeCollector();
        assert.equal(feeCollectorBefore, feeCollector);
        const feeBasisPoints = await contracts.dat.feeBasisPoints();
        assert.equal(
          feeBasisPointsBefore.toString(),
          feeBasisPoints.toString()
        );
        const initGoal = await contracts.dat.initGoal();
        assert.equal(initGoalBefore.toString(), initGoal.toString());
        const initInvestorBalance = await contracts.dat.initInvestors(trader);
        assert.equal(
          initInvestorBalanceBefore.toString(),
          initInvestorBalance.toString()
        );
        const initReserve = await contracts.dat.initReserve();
        assert.equal(initReserveBefore.toString(), initReserve.toString());
        const investmentReserveBasisPoints = await contracts.dat.investmentReserveBasisPoints();
        assert.equal(
          investmentReserveBasisPointsBefore.toString(),
          investmentReserveBasisPoints.toString()
        );
        const minInvestment = await contracts.dat.minInvestment();
        assert.equal(minInvestmentBefore.toString(), minInvestment.toString());
        const revenueCommitmentBasisPoints = await contracts.dat.revenueCommitmentBasisPoints();
        assert.equal(
          revenueCommitmentBasisPointsBefore.toString(),
          revenueCommitmentBasisPoints.toString()
        );
        const state = await contracts.dat.state();
        assert.equal(stateBefore.toString(), state.toString());

        // Version bumped with latest release
        const version = await contracts.dat.version();
        assert.notEqual(versionBefore, version);
        const accountNonce = await contracts.dat.nonces(trader);
        assert.equal(accountNonceBefore.toString(), accountNonce.toString());
        const domainSeparator = await contracts.dat.DOMAIN_SEPARATOR();
        assert.equal(domainSeparatorBefore, domainSeparator);

        // This value changed with the upgrade to EIP-2612
        const permitTypehash = await contracts.dat.PERMIT_TYPEHASH();
        assert.notEqual(permitTypehashBefore, permitTypehash);
      });
    });
  });
});
