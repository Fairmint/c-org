const fairArtifact = artifacts.require("FAIR");

contract("fair / erc20 / decimals", () => {
  let fair;

  before(async () => {
    fair = await fairArtifact.new();
    await fair.initialize();
  });

  it("should have 18 decimals", async () => {
    /**
     * Per ERC-777 this value must always be exactly 18.
     */
    assert.equal(await fair.decimals(), 18);
  });
});
