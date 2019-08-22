const { deployDat } = require("../../helpers");

contract("fair / erc20 / burn", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0
    });

    for (let i = 0; i < accounts.length; i++) {
      await contracts.erc1404.approve(accounts[i], true, {
        from: await contracts.dat.control()
      });
    }

    await contracts.dat.buy(accounts[1], "420000000000000000000", 1, {
      value: "420000000000000000000",
      from: accounts[1]
    });
  });

  describe("can burn", () => {
    const burnAmount = 20;
    let accountBalanceBefore;

    before(async () => {
      accountBalanceBefore = await contracts.fair.balanceOf(accounts[0]);
      await contracts.fair.burn(burnAmount, web3.utils.asciiToHex(""));
    });

    it("account balance went down", async () => {
      assert.equal(
        (await contracts.fair.balanceOf(accounts[0])).toString(),
        accountBalanceBefore.subn(burnAmount).toString()
      );
    });
  });

  it("can't burn more than I have");
});
