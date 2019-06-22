const fseArtifact = artifacts.require("FairSyntheticEquity");

contract("fse / erc20 / burn", accounts => {
  let fse;

  before(async () => {
    fse = await fseArtifact.new();
    await fse.initialize();
    await fse.mint(
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
      accountBalanceBefore = await fse.balanceOf(accounts[0]);
      await fse.burn(burnAmount, web3.utils.asciiToHex(""));
    });

    it("account balance went down", async () => {
      assert.equal(
        (await fse.balanceOf(accounts[0])).toString(),
        accountBalanceBefore.subn(burnAmount).toString()
      );
    });
  });

  it("can't burn more than I have");
});
