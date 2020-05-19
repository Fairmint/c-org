const { approveAll, deployDat } = require("../helpers");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const { reverts } = require("truffle-assertions");
const { tokens, constants } = require("hardlydifficult-eth");

contract("dat / upgrade", (accounts) => {
  let contracts;
  const [owner, trader, otherAccount] = accounts;

  beforeEach(async () => {
    const dai = await tokens.dai.deploy(web3, accounts[0]);
    contracts = await deployDat(
      accounts,
      {
        autoBurn: true,
        currency: dai.address,
        control: owner,
        feeBasisPoints: 987,
        initGoal: 9812398,
        openUntilAtLeast: 9182731982721,
      },
      true,
      false
    );
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
        const version = await contracts.dat.version();
        assert.equal(versionBefore, version);
        const accountNonce = await contracts.dat.nonces(trader);
        assert.equal(accountNonceBefore.toString(), accountNonce.toString());
        const domainSeparator = await contracts.dat.DOMAIN_SEPARATOR();
        assert.equal(domainSeparatorBefore, domainSeparator);
        const permitTypehash = await contracts.dat.PERMIT_TYPEHASH();
        assert.equal(permitTypehashBefore, permitTypehash);
      });
    });
  });
});
