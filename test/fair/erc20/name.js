const { shouldFail, deployDat, updateDatConfig } = require("../../helpers");

contract("fair / erc20 / name", accounts => {
  const maxLengthName =
    "Names are 64 characters max.....................................";
  let contracts;
  let tx;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("should have an empty name by default name", async () => {
    assert.equal(await contracts.dat.name(), "");
  });

  describe("updateName", () => {
    describe("`control` can change name", () => {
      const newName = "New Name";

      before(async () => {
        tx = await updateDatConfig(contracts, { name: newName });
      });

      it("should have the new name", async () => {
        assert.equal(await contracts.dat.name(), newName);
      });

      it("should emit an event", async () => {
        const log = tx.logs[0];
        assert.notEqual(log, undefined);
        // assert.equal(log.event, 'NameUpdated');
        // assert.equal(log.args._previousName, name);
        // assert.equal(log.args._name, newName);
      });

      describe("max length", () => {
        before(async () => {
          tx = await updateDatConfig(contracts, { name: maxLengthName });
        });

        it("should have the new name", async () => {
          assert.equal(await contracts.dat.name(), maxLengthName);
        });

        it("should fail to update longer than the max", async () => {
          await shouldFail(
            updateDatConfig(contracts, {
              name: `${maxLengthName} more characters`
            })
          );
        });
      });
    });
  });
});
