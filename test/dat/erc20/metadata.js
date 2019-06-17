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

      describe('max length', () => {
        const maxLengthName = 'Names are 32 characters max.....';

        before(async () => {
          tx = await dat.updateName(maxLengthName);
        });

        it('should have the new name', async () => {
          assert.equal(await dat.name(), maxLengthName);
        });

        describe('truncates updates longer than the max', () => {
          before(async () => {
            tx = await dat.updateName(`${maxLengthName} more characters`);
          });

          it('should have the truncated the name', async () => {
            assert.equal(await dat.name(), maxLengthName);
          });
        });
      });
    });

    it('should fail to change name from a different account', async () => {
      await shouldFail(dat.updateName('Test', { from: accounts[2] }), 'CONTROL_ONLY');
    });
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
        const maxLengthSymbol = '8charMax';

        before(async () => {
          tx = await dat.updateSymbol(maxLengthSymbol);
        });

        it('should have the new symbol', async () => {
          assert.equal(await dat.symbol(), maxLengthSymbol);
        });

        describe('truncates updates longer than the max', () => {
          before(async () => {
            tx = await dat.updateSymbol(`${maxLengthSymbol} more characters`);
          });

          it('should have the truncated the symbol', async () => {
            assert.equal(await dat.symbol(), maxLengthSymbol);
          });
        });
      });
    });

    it('should fail to change symbol from a different account', async () => {
      await shouldFail(dat.updateSymbol('Test', { from: accounts[2] }), 'CONTROL_ONLY');
    });
  });
});
