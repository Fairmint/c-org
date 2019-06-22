const fseArtifact = artifacts.require("FairSyntheticEquity");

contract("fse / erc20 / totalSupply", () => {
  let fse;

  before(async () => {
    fse = await fseArtifact.new();
    await fse.initialize();
  });

  it("defaults to 0", async () => {
    assert.equal((await fse.totalSupply()).toString(), 0);
  });

  it("goes up on mint");
  it("goes down on burn");
  it("no change on transfer");
});
