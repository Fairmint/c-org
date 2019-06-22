const { deployDat } = require("../../helpers");

contract("fse / erc20 / balanceOf", accounts => {
  let dat;
  const initReserve = 42;

  before(async () => {
    dat = await deployDat({ initReserve });
  });

  describe("can burn initReserve", () => {
    const burnAmount = 20;
    let accountBalanceBefore;

    before(async () => {
      accountBalanceBefore = await fse.balanceOf(accounts[0]);
      await dat.burn(burnAmount, web3.utils.asciiToHex(""));
    });

    it("account balance went down", async () => {
      assert.equal(
        (await fse.balanceOf(accounts[0])).toString(),
        accountBalanceBefore.subn(burnAmount).toString()
      );
    });
  });

  it("can burn after buy");
});
