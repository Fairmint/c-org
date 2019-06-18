const { deployDat, shouldFail, updateDatConfig } = require('../../helpers');

contract('dat / erc20 / metadata', (accounts) => {
  const symbol = 'SBL';
  const maxLengthSymbol = 'Symbols are 32 characters max...';
  let dat;
  let tx;

  before(async () => {
    dat = await deployDat({ symbol });
  });

  it('should have a symbol', async () => {
    assert.equal(await dat.symbol(), symbol);
  });

  it('can deploy with max length symbol', async () => {
    await deployDat({ symbol: maxLengthSymbol });
  });

  it('should fail to deploy with a symbol longer than the max', async () => {
    await shouldFail(deployDat({ symbol: `${maxLengthSymbol} more characters` }));
  });

  describe('updateSymbol', () => {
    describe('`control` can change symbol', () => {
      const newSymbol = 'NSYM';

      before(async () => {
        tx = await updateDatConfig(dat, { symbol: newSymbol }, accounts[0]);
      });

      it('should have the new symbol', async () => {
        assert.equal(await dat.symbol(), newSymbol);
      });

      it('should emit an event', async () => {
        // TODO
        // const log = tx.logs[0];
        // assert.equal(log.event, 'SymbolUpdated');
        // assert.equal(log.args._previousSymbol, symbol);
        // assert.equal(log.args._symbol, newSymbol);
      });

      describe('max length', () => {
        before(async () => {
          tx = await updateDatConfig(dat, { symbol: maxLengthSymbol }, accounts[0]);
        });

        it('should have the new symbol', async () => {
          assert.equal(await dat.symbol(), maxLengthSymbol);
        });

        it('should fail to update longer than the max', async () => {
          await shouldFail(updateDatConfig(dat, { symbol: `${maxLengthSymbol} more characters` }, accounts[0]));
        });
      });
    });

    it('should fail to change symbol from a different account', async () => {
      await shouldFail(updateDatConfig(dat, { symbol: 'Test' }, accounts[2]), 'CONTROL_ONLY');
    });
  });
});
