/**
 * Tests the ability to buy dat tokens
 */

const { deployDat, shouldFail, constants } = require("../helpers");

contract("dat / initialize", accounts => {
  let contracts;

  it("shouldFail to init twice", async () => {
    contracts = await deployDat(accounts);
    await shouldFail(
      contracts.dat.initialize(
        await contracts.dat.initReserve(),
        await contracts.dat.currency(),
        await contracts.dat.initGoal(),
        await contracts.dat.buySlopeNum(),
        await contracts.dat.buySlopeDen(),
        await contracts.dat.investmentReserveBasisPoints(),
        await contracts.dat.name(),
        await contracts.dat.symbol(),
        { from: await contracts.dat.control() }
      ),
      "ALREADY_INITIALIZED"
    );
  });

  it("shouldFail with EXCESSIVE_GOAL", async () => {
    await shouldFail(
      deployDat(accounts, { initGoal: constants.MAX_UINT }),
      "EXCESSIVE_GOAL"
    );
  });

  it("shouldFail with INVALID_SLOPE_NUM", async () => {
    await shouldFail(
      deployDat(accounts, { buySlopeNum: "0" }),
      "INVALID_SLOPE_NUM"
    );
  });

  it("shouldFail with INVALID_SLOPE_DEN", async () => {
    await shouldFail(
      deployDat(accounts, { buySlopeDen: "0" }),
      "INVALID_SLOPE_DEN"
    );
  });

  it("shouldFail with EXCESSIVE_SLOPE_NUM", async () => {
    await shouldFail(
      deployDat(accounts, { buySlopeNum: constants.MAX_UINT }),
      "EXCESSIVE_SLOPE_NUM"
    );
  });

  it("shouldFail with EXCESSIVE_SLOPE_DEN", async () => {
    await shouldFail(
      deployDat(accounts, { buySlopeDen: constants.MAX_UINT }),
      "EXCESSIVE_SLOPE_DEN"
    );
  });

  it("shouldFail with INVALID_RESERVE", async () => {
    await shouldFail(
      deployDat(accounts, { investmentReserveBasisPoints: "100000" }),
      "INVALID_RESERVE"
    );
  });
});
