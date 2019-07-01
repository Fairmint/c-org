const fairArtifact = artifacts.require("FAIR");

contract("fair / erc20 / totalSupply", () => {
  let fair;

  before(async () => {
    fair = await fairArtifact.new();
    await fair.initialize();
  });

  it("defaults to 0", async () => {
    assert.equal((await fair.totalSupply()).toString(), 0);
  });

  it("goes up on mint");
  it("goes down on burn");
  it("no change on transfer");
});
