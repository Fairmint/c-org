const { shouldFail, updateFseConfig } = require("../../helpers");

const fseArtifact = artifacts.require("FairSyntheticEquity");

contract("fse / erc20 / symbol", accounts => {
  const maxLengthSymbol = "Symbols are 32 characters max...";
  let fse;
  let tx;

  before(async () => {
    fse = await fseArtifact.new();
    await fse.initialize();
  });

  it("should have an empty symbol by default", async () => {
    assert.equal(await fse.symbol(), "");
  });

  describe("updateSymbol", () => {
    describe("`control` can change symbol", () => {
      const newSymbol = "NSYM";

      before(async () => {
        tx = await updateFseConfig(fse, { symbol: newSymbol }, accounts[0]);
      });

      it("should have the new symbol", async () => {
        assert.equal(await fse.symbol(), newSymbol);
      });

      it("should emit an event", async () => {
        const log = tx.logs[0];
        // TODO
        assert.notEqual(log, undefined);
        // assert.equal(log.event, 'SymbolUpdated');
        // assert.equal(log.args._previousSymbol, symbol);
        // assert.equal(log.args._symbol, newSymbol);
      });

      describe("max length", () => {
        before(async () => {
          tx = await updateFseConfig(
            fse,
            { symbol: maxLengthSymbol },
            accounts[0]
          );
        });

        it("should have the new symbol", async () => {
          assert.equal(await fse.symbol(), maxLengthSymbol);
        });

        it("should fail to update longer than the max", async () => {
          await shouldFail(
            updateFseConfig(
              fse,
              { symbol: `${maxLengthSymbol} more characters` },
              accounts[0]
            )
          );
        });
      });
    });

    it("should fail to change symbol from a different account", async () => {
      await shouldFail(
        updateFseConfig(fse, { symbol: "Test" }, accounts[2]),
        "CONTROL_ONLY"
      );
    });
  });
});
