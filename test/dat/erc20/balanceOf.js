const { deployDat } = require('../../helpers');

contract('dat / erc20 / balanceOf', (accounts) => {
  let dat;
  const initReserve = 42;

  before(async () => {
    dat = await deployDat({ initReserve });
  });

  it('`control` defaults to initReserve', async () => {
    assert.equal((await dat.balanceOf(accounts[0])).toString(), initReserve);
  });

  it('other accounts default to 0', async () => {
    assert.equal(await dat.balanceOf(accounts[1]), 0);
  });

  it('goes up on buy');
  it('goes down on sell');
  it('goes down on burn');
  it('on transfer - from down, to up');
});
