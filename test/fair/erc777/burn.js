const { deployDat } = require("../../helpers");

contract("fair / erc20 / burn", accounts => {
  let dat;
  let fair;

  before(async () => {
    [dat, fair] = await deployDat(
      {
        initGoal: 0
      },
      accounts[0]
    );

    await dat.buy(accounts[1], "4200000000000000000000", 1, {
      value: "4200000000000000000000",
      from: accounts[1]
    });
  });

  describe("can burn", () => {
    const burnAmount = 20;
    let accountBalanceBefore;

    before(async () => {
      accountBalanceBefore = await fair.balanceOf(accounts[0]);
      await fair.burn(burnAmount, web3.utils.asciiToHex(""));
    });

    it("account balance went down", async () => {
      assert.equal(
        (await fair.balanceOf(accounts[0])).toString(),
        accountBalanceBefore.subn(burnAmount).toString()
      );
    });
  });

  it("can't burn more than I have");
});
