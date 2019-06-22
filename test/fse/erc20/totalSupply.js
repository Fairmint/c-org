const fseArtifact = artifacts.require("FairSyntheticEquity");

contract("fse / erc20 / totalSupply", () => {
  let fse;
  const initReserve = 42;

  before(async () => {
    fse = await fseArtifact.new();
    await fse.initialize();
  });

  it("defaults to initReserve", async () => {
    assert.equal((await fse.totalSupply()).toString(), initReserve);
  });

  it("goes up on buy");
  it("goes down on sell");
  it("goes down on burn");
  it("no change on transfer");
});
