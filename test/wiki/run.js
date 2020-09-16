const { deployDat, updateDatConfig } = require("../datHelpers");
const { approveAll } = require("../helpers");

const behaviors = require("../behaviors");
const { default: BigNumber } = require("bignumber.js");
const { time } = require("@openzeppelin/test-helpers");
const { tokens } = require("hardlydifficult-eth");
const constants = require("../helpers/constants");

contract("wiki / run", (accounts) => {
  const initReserve = "1000000000000000000000";
  const [control, beneficiary, feeCollector] = accounts;
  const investors = [accounts[3], accounts[4], accounts[5]];
  let contracts;

  beforeEach(async function () {
    contracts = await deployDat(accounts, {
      initGoal: "0",
      initReserve,
      control,
      beneficiary,
      feeCollector,
      feeBasisPoints: "10",
    });
    await approveAll(contracts, accounts);

    for (let i = 0; i < investors.length; i++) {
      await contracts.dat.buy(investors[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: investors[i],
      });
    }

    this.contract = contracts.dat;
    this.whitelist = contracts.whitelist;
  });

  behaviors.wiki.run.all(control, beneficiary, investors);

  describe("With minDuration", () => {
    beforeEach(async function () {
      const currentTime = new BigNumber(await time.latest());
      await updateDatConfig(contracts, {
        minDuration: currentTime.plus(10).toFixed(),
      });
    });

    behaviors.wiki.run.allWithMinDuration(beneficiary, investors);
  });

  describe("With 0 initGoal and 0 reserve", () => {
    beforeEach(async function () {
      contracts = await deployDat(accounts, {
        initGoal: 0,
        initReserve,
        feeBasisPoints: "10",
        beneficiary,
      });
      await approveAll(contracts, accounts);

      this.contract = contracts.dat;
      this.whitelist = contracts.whitelist;
    });

    behaviors.wiki.run.allWith0GoalAndReserve(beneficiary, investors);
  });

  describe("when reserve is high", () => {
    beforeEach(async () => {
      // Redeploy using an ERC-20
      const token = await tokens.sai.deploy(web3, accounts[0]);
      contracts = await deployDat(accounts, { currency: token.address });
      await approveAll(contracts, accounts);
      await token.mint(contracts.dat.address, constants.MAX_UINT, {
        from: accounts[0],
      });
    });

    it("exitFee is 0", async () => {
      const exitFee = new BigNumber(await contracts.dat.estimateExitFee(0));
      assert.equal(exitFee, 0);
    });
  });
});
