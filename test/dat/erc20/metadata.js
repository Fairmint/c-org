const { deployDat, shouldFail } = require('../../helpers');

contract('dat / erc20 / metadata', (accounts) => {
  const name = 'Token Name';
  const symbol = 'SBL';
  let dat;
  let tx;

  before(async () => {
    dat = await deployDat({ name, symbol });
  });

  it('should have a name', async () => {
    assert.equal(await dat.name(), name);
  });

  it('should have a symbol', async () => {
    assert.equal(await dat.symbol(), symbol);
  });

  it('should have 18 decimals', async () => {
    assert.equal(await dat.decimals(), 18);
  });

  describe('updateName', () => {
    describe('can change name', () => {
      const newName = 'New Name';

      before(async () => {
        tx = await dat.updateName(newName);
      });

      it('should have the new name', async () => {
        assert.equal(await dat.name(), newName);
      });

      it('should emit an event', async () => {
        console.log(tx);
      });
    });

    it('should fail to change name from a different account', async () => {
      await shouldFail(dat.updateName('Test', { from: accounts[2] }), 'CONTROL_ONLY');
    });
  });

  describe('updateSymbol');
});
