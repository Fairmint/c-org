const { deployDat } = require('../../helpers');

contract('dat / erc20 / metadata', () => {
  const name = 'Token Name';
  const symbol = 'SBL';
  let dat;

  before(async () => {
    dat = await deployDat({ name, symbol });
  });

  it('should have a name', async () => {
    assert.equal(await dat.name(), name);
  });

  it('should have a symbol', async () => {
    assert.equal(await dat.symbol, symbol);
  });

  it('should have 18 decimals', async () => {
    assert.equal(await dat.decimals, 18);
  });
});
