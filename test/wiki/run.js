const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");

const behaviors = require("../behaviors");

contract("wiki / run", (accounts) => {
  const initReserve = "1000000000000000000000";
  const [nonTokenHolder, control, beneficiary] = accounts;
  const investors = [accounts[3], accounts[4], accounts[5]];
  let contracts;

  beforeEach(async function () {
    contracts = await deployDat(accounts, {
      initGoal: "0",
      initReserve,
      control,
      beneficiary,
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

  behaviors.wiki.run.all(control, beneficiary, investors, nonTokenHolder);
});
