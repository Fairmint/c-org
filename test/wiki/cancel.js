const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");

const behaviors = require("../behaviors");

contract("wiki / cancel", (accounts) => {
  const initReserve = "1000000000000000000000";
  const [control, beneficiary, investor] = accounts;
  let contracts;

  beforeEach(async function () {
    contracts = await deployDat(accounts, {
      initGoal: "10000000000000000000000",
      initReserve,
      control,
      beneficiary,
    });
    await approveAll(contracts, accounts);

    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i],
      });
    }

    await contracts.dat.close({ from: beneficiary });

    this.contract = contracts.dat;
  });

  behaviors.wiki.cancel.all(control, beneficiary, investor);
});
