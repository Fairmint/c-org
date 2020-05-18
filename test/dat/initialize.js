const { deployDat, constants } = require("../helpers");
const { reverts } = require("truffle-assertions");
const BigNumber = require("bignumber.js");

contract("dat / initialize", (accounts) => {
  let contracts;

  it("shouldFail to init twice", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.initialize(
        await contracts.dat.initReserve(),
        await contracts.dat.currency(),
        await contracts.dat.initGoal(),
        await contracts.dat.buySlopeNum(),
        await contracts.dat.buySlopeDen(),
        await contracts.dat.investmentReserveBasisPoints(),
        await contracts.dat.setupFee(),
        await contracts.dat.setupFeeRecipient(),
        await contracts.dat.name(),
        await contracts.dat.symbol(),
        { from: await contracts.dat.control() }
      ),
      "Contract instance has already been initialized"
    );
  });

  it("can deploy without any initReserve", async () => {
    await deployDat(accounts, { initReserve: 0 });
  });

  it("shouldFail with EXCESSIVE_GOAL", async () => {
    await reverts(
      deployDat(accounts, { initGoal: constants.MAX_UINT }),
      "EXCESSIVE_GOAL"
    );
  });

  it("shouldFail with INVALID_SLOPE_NUM", async () => {
    await reverts(
      deployDat(accounts, { buySlopeNum: "0" }),
      "INVALID_SLOPE_NUM"
    );
  });

  it("shouldFail with INVALID_SLOPE_DEN", async () => {
    await reverts(
      deployDat(accounts, { buySlopeDen: "0" }),
      "INVALID_SLOPE_DEN"
    );
  });

  it("shouldFail with EXCESSIVE_SLOPE_NUM", async () => {
    await reverts(
      deployDat(accounts, { buySlopeNum: constants.MAX_UINT }),
      "EXCESSIVE_SLOPE_NUM"
    );
  });

  it("shouldFail with EXCESSIVE_SLOPE_DEN", async () => {
    await reverts(
      deployDat(accounts, { buySlopeDen: constants.MAX_UINT }),
      "EXCESSIVE_SLOPE_DEN"
    );
  });

  it("shouldFail with INVALID_RESERVE", async () => {
    await reverts(
      deployDat(accounts, { investmentReserveBasisPoints: "100000" }),
      "INVALID_RESERVE"
    );
  });

  it("shouldFail if recipient is missing", async () => {
    await reverts(
      deployDat(accounts, { setupFee: "1" }, false),
      "MISSING_SETUP_FEE_RECIPIENT"
    );
  });

  it("shouldFail if fee is missing", async () => {
    await reverts(
      deployDat(accounts, { setupFeeRecipient: accounts[3] }, false),
      "MISSING_SETUP_FEE"
    );
  });

  describe("fee vs goal", () => {
    const buySlopeNum = "42";
    const buySlopeDen = "100000000000000000000";
    const initGoal = "420000000000000000000000";
    let goal;

    beforeEach(async () => {
      // buy_slope*(init_goal^2)/2
      goal = new BigNumber(buySlopeNum)
        .div(buySlopeDen)
        .times(new BigNumber(initGoal).pow(2))
        .div(2);
      console.log(goal.toFixed());
      goal = goal.dp(0, BigNumber.ROUND_DOWN);
    });

    it("should work if fee is equal to the goal", async () => {
      await deployDat(accounts, {
        buySlopeNum,
        buySlopeDen,
        initGoal,
        setupFee: goal,
        setupFeeRecipient: accounts[3],
      });
    });

    it("shouldFail if fee is greater than goal", async () => {
      await reverts(
        deployDat(
          accounts,
          {
            buySlopeNum,
            buySlopeDen,
            initGoal,
            setupFee: goal.plus(1),
            setupFeeRecipient: accounts[3],
          },
          false
        ),
        "EXCESSIVE_SETUP_FEE"
      );
    });
  });
});
