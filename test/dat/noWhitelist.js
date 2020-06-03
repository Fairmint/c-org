const { constants, deployDat } = require("../helpers");

contract("dat / noWhitelist", (accounts) => {
  let contracts;
  const investor = accounts[5];

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0,
      whitelistAddress: constants.ZERO_ADDRESS,
    });
    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
      if (accounts[i] !== investor) {
        await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
          value: "100000000000000000000",
          from: accounts[i],
        });
      }
    }

    await contracts.dat.pay("100000000000000000000", {
      value: "100000000000000000000",
      from: investor,
    });
  });

  it("FAIR balanceOf should not have changed on pay", async () => {
    const balance = await contracts.dat.balanceOf(investor);

    assert.equal(balance.toString(), "0");
  });
});
