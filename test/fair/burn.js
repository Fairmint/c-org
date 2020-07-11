const { approveAll, deployDat } = require("../helpers");
const behaviors = require("../behaviors");

contract("fair / burn", (accounts) => {
  let contracts;
  const tokenOwner = accounts[1];

  beforeEach(async function () {
    contracts = await deployDat(accounts, {
      initGoal: 0,
    });
    await approveAll(contracts, accounts);

    await contracts.dat.buy(tokenOwner, "420000000000000000000", 1, {
      value: "420000000000000000000",
      from: tokenOwner,
    });

    this.contract = contracts.dat;
  });

  behaviors.erc20.burn(tokenOwner);
});
