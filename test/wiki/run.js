const { deployDat, updateDatConfig } = require("../datHelpers");
const { approveAll } = require("../helpers");

const behaviors = require("../behaviors");
const { default: BigNumber } = require("bignumber.js");
const { time } = require("@openzeppelin/test-helpers");
const constants = require("../helpers/constants");
const tokens = require("hardlydifficult-eth/src/tokens");

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
      behaviors.wiki.run.allWithMinDuration(control, beneficiary, investors);
    });
  });

  describe("With highReserve", () => {
    const initReserve = "1000000000000000000000";

    beforeEach(async function () {
      // Redeploy using an ERC-20
      const token = await tokens.sai.deploy(web3, control);
      contracts = await deployDat(accounts, {
        currency: token.address,
        initReserve,
      });
      await approveAll(contracts, accounts);
      await token.mint(this.contract.address, constants.MAX_UINT, {
        from: control,
      });
    });

    behaviors.wiki.run.allWithHighReserve(control, beneficiary, investors);
  });

  describe("With 0 initGoal and 0 reserve", () => {
    beforeEach(async function () {
      contracts = await deployDat(accounts, {
        initGoal: "0",
        initReserve: "0",
      });
      await approveAll(contracts, accounts);
    });

    behaviors.wiki.run.allWith0GoalAndReserve(control, beneficiary, investors);
  });
});
