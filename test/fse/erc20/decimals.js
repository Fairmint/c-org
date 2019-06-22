const fseArtifact = artifacts.require("FairSyntheticEquity");

contract("fse / erc20 / decimals", () => {
  let fse;

  before(async () => {
    fse = await fseArtifact.new();
    await fse.initialize();
  });

  it("should have 18 decimals", async () => {
    /**
     * Per ERC-777 this value must always be exactly 18.
     */
    assert.equal(await fse.decimals(), 18);
  });
});
