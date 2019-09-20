const { shouldFail, deployDat, updateDatConfig } = require("../../helpers");

contract("fair / erc20 / symbol", accounts => {
  const maxLengthSymbol = "Symbols are 32 characters max...";
  let contracts;
  let tx;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("should have an empty symbol by default", async () => {
    assert.equal(await contracts.dat.symbol(), "");
  });

  describe("updateSymbol", () => {
    describe("`control` can change symbol", () => {
      const newSymbol = "NSYM";

      before(async () => {
        tx = await updateDatConfig(contracts, { symbol: newSymbol });
      });

      it("should have the new symbol", async () => {
        assert.equal(await contracts.dat.symbol(), newSymbol);
      });

      it("should emit an event", async () => {
        const log = tx.logs[0];
        assert.notEqual(log, undefined);
        // assert.equal(log.event, 'SymbolUpdated');
        // assert.equal(log.args._previousSymbol, symbol);
        // assert.equal(log.args._symbol, newSymbol);
      });

      describe("max length", () => {
        before(async () => {
          tx = await updateDatConfig(contracts, { symbol: maxLengthSymbol });
        });

        it("should have the new symbol", async () => {
          assert.equal(await contracts.dat.symbol(), maxLengthSymbol);
        });

        it("should fail to update longer than the max", async () => {
          await shouldFail(
            updateDatConfig(contracts, {
              symbol: `${maxLengthSymbol} more characters`
            })
          );
        });
      });
    });
  });
});
