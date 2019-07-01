const fairArtifact = artifacts.require("FAIR");

contract("fair / erc20 / burn", accounts => {
  let fair;

  before(async () => {
    fair = await fairArtifact.new();
    await fair.initialize();
    await fair.mint(
      accounts[0],
      accounts[0],
      42,
      web3.utils.asciiToHex(""),
      web3.utils.asciiToHex("")
    );
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
