const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");

const behaviors = require("../behaviors");

contract("wiki / init", (accounts) => {
  const initGoal = "10000000000000000000000";
  const initReserve = "1000000000000000000000";
  const feeBasisPoints = "10";
  const [
    nonTokenHolder,
    control,
    beneficiary,
    setupFeeRecipient,
    feeCollector,
  ] = accounts;
  const investors = [accounts[6], accounts[7], accounts[8]];
  let contracts;

  describe("Without setup fee", () => {
    beforeEach(async function () {
      contracts = await deployDat(
        accounts,
        {
          initGoal,
          initReserve,
          feeBasisPoints,
          control,
          beneficiary,
          feeCollector,
        },
        true,
        false
      );
      await approveAll(contracts, accounts);

      this.contract = contracts.dat;
      this.whitelist = contracts.whitelist;
    });

    behaviors.wiki.init.allWithoutSetupFee(
      control,
      beneficiary,
      investors,
      nonTokenHolder
    );
  });

  describe("With setup fee", () => {
    const setupFee = "420000000";

    beforeEach(async function () {
      contracts = await deployDat(
        accounts,
        {
          initGoal,
          initReserve,
          feeBasisPoints,
          feeCollector,
          control,
          beneficiary,
          setupFee,
          setupFeeRecipient,
        },
        true,
        false
      );
      await approveAll(contracts, accounts);

      this.contract = contracts.dat;
      this.whitelist = contracts.whitelist;
    });

    behaviors.wiki.init.allWithSetupFee(
      beneficiary,
      investors,
      setupFeeRecipient
    );
  });
});
