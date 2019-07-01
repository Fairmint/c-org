const fairArtifact = artifacts.require("FAIR");

contract("fair / erc20 / balanceOf", accounts => {
  let fair;

  before(async () => {
    fair = await fairArtifact.new();
    await fair.initialize();
  });

  it("accounts default to 0", async () => {
    assert.equal(await fair.balanceOf(accounts[1]), 0);
  });

  it("goes up on buy");
  it("goes down on sell");
  it("goes down on burn");
  it("on transfer - from down, to up");
});
