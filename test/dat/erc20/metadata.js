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
    describe('`control` can change name', () => {
      const newName = 'New Name';
      const maxLengthName = 'Names are 32 characters max.....';

      before(async () => {
        tx = await dat.updateName(newName);
      });

      it('should have the new name', async () => {
        assert.equal(await dat.name(), newName);
      });

      it('should emit an event', async () => {
        const log = tx.logs[0];
        assert.equal(log.event, 'NameUpdated');
        assert.equal(log.args._previousName, name);
        assert.equal(log.args._name, newName);
      });

      it('Can set a name up to 32 characters long', async () => {
        await shouldFail(dat.updateName(maxLengthName));
      });

      it('should fail to set a long name', async () => {
        await shouldFail(dat.updateName(`${maxLengthName}.`));
      });
    });

    it('should fail to change name from a different account', async () => {
      await shouldFail(dat.updateName('Test', { from: accounts[2] }), 'CONTROL_ONLY');
    });
  });

  describe('updateSymbol', () => {
    it('todo');
  });
});
