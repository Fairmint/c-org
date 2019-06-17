const { deployDat, shouldFail } = require('../../helpers');

contract('dat / erc20 / metadata', (accounts) => {
  const symbol = 'SBL';
  const maxLengthSymbol = '8charMax';
  let dat;
  let tx;

  before(async () => {
    dat = await deployDat({ symbol });
  });

  it('should have a symbol', async () => {
    assert.equal(await dat.symbol(), symbol);
  });

  it('should fail to deploy with a symbol longer than the max', async () => {
    await shouldFail(deployDat({ name: `${maxLengthSymbol} more characters` }));
  });

  describe('updateSymbol', () => {
    describe('`control` can change symbol', () => {
      const newSymbol = 'NSYM';

      before(async () => {
        tx = await dat.updateSymbol(newSymbol);
      });

      it('should have the new symbol', async () => {
        assert.equal(await dat.symbol(), newSymbol);
      });

      it('should emit an event', async () => {
        const log = tx.logs[0];
        assert.equal(log.event, 'SymbolUpdated');
        assert.equal(log.args._previousSymbol, symbol);
        assert.equal(log.args._symbol, newSymbol);
      });

      describe('max length', () => {
        before(async () => {
          tx = await dat.updateSymbol(maxLengthSymbol);
        });

        it('should have the new symbol', async () => {
          assert.equal(await dat.symbol(), maxLengthSymbol);
        });

        it('should fail to update longer than the max', async () => {
          await shouldFail(dat.updateSymbol(`${maxLengthSymbol} more characters`));
        });
      });
    });

    it('should fail to change symbol from a different account', async () => {
      await shouldFail(dat.updateSymbol('Test', { from: accounts[2] }), 'CONTROL_ONLY');
    });
  });
});
