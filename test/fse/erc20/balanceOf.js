const fseArtifact = artifacts.require('FairSyntheticEquity');

contract('fse / erc20 / balanceOf', (accounts) => {
  let fse;

  before(async () => {
    fse = await fseArtifact.deployed();
    await fse.initialize();
  });

  it('accounts default to 0', async () => {
    assert.equal(await fse.balanceOf(accounts[1]), 0);
  });

  it('goes up on buy');
  it('goes down on sell');
  it('goes down on burn');
  it('on transfer - from down, to up');
});
