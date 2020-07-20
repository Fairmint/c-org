const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");
const behaviors = require("../behaviors");

contract("dat / ERC20", (accounts) => {
  let contracts;
  const [beneficiary, tokenOwner, nonTokenHolder, operator] = accounts;

  beforeEach(async function () {
    contracts = await deployDat(accounts, {
      initReserve: 0,
      beneficiary,
    });
    await approveAll(contracts, accounts);

    await contracts.dat.buy(tokenOwner, "420000000000000000000", 1, {
      value: "420000000000000000000",
      from: tokenOwner,
    });

    this.contract = contracts.dat;
  });

  behaviors.erc20.all(tokenOwner, nonTokenHolder, operator);
});
