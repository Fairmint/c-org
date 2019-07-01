const { shouldFail, updateFairConfig } = require("../../helpers");

const fairArtifact = artifacts.require("FAIR");

contract("fair / erc20 / symbol", accounts => {
  const maxLengthSymbol = "Symbols are 32 characters max...";
  let fair;
  let tx;

  before(async () => {
    fair = await fairArtifact.new();
    await fair.initialize();
  });

  it("should have an empty symbol by default", async () => {
    assert.equal(await fair.symbol(), "");
  });

  describe("updateSymbol", () => {
    describe("`control` can change symbol", () => {
      const newSymbol = "NSYM";

      before(async () => {
        tx = await updateFairConfig(fair, { symbol: newSymbol }, accounts[0]);
      });

      it("should have the new symbol", async () => {
        assert.equal(await fair.symbol(), newSymbol);
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
          tx = await updateFairConfig(
            fair,
            { symbol: maxLengthSymbol },
            accounts[0]
          );
        });

        it("should have the new symbol", async () => {
          assert.equal(await fair.symbol(), maxLengthSymbol);
        });

        it("should fail to update longer than the max", async () => {
          await shouldFail(
            updateFairConfig(
              fair,
              { symbol: `${maxLengthSymbol} more characters` },
              accounts[0]
            )
          );
        });
      });
    });

    it("should fail to change symbol from a different account", async () => {
      await shouldFail(
        updateFairConfig(fair, { symbol: "Test" }, accounts[2]),
        "OWNER_ONLY"
      );
    });
  });
});
