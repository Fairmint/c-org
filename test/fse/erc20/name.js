const { shouldFail, updateDatConfig } = require("../../helpers");

const fseArtifact = artifacts.require("FairSyntheticEquity");

contract("fse / erc20 / name", accounts => {
  const maxLengthName =
    "Names are 64 characters max.....................................";
  let fse;
  let tx;

  before(async () => {
    fse = await fseArtifact.deployed();
    await fse.initialize();
  });

  it("should have an empty name by default name", async () => {
    assert.equal(await fse.name(), "");
  });

  describe("updateName", () => {
    describe("`control` can change name", () => {
      const newName = "New Name";

      before(async () => {
        tx = await updateDatConfig(dat, { name: newName }, accounts[0]);
      });

      it("should have the new name", async () => {
        assert.equal(await dat.name(), newName);
      });

      it("should emit an event", async () => {
        const log = tx.logs[0];
        assert.notEqual(log, undefined);
        // TODO
        // assert.equal(log.event, 'NameUpdated');
        // assert.equal(log.args._previousName, name);
        // assert.equal(log.args._name, newName);
      });

      describe("max length", () => {
        before(async () => {
          tx = await updateDatConfig(dat, { name: maxLengthName }, accounts[0]);
        });

        it("should have the new name", async () => {
          assert.equal(await dat.name(), maxLengthName);
        });

        it("should fail to update longer than the max", async () => {
          await shouldFail(
            updateDatConfig(
              dat,
              { name: `${maxLengthName} more characters` },
              accounts[0]
            )
          );
        });
      });
    });

    it("should fail to change name from a different account", async () => {
      await shouldFail(
        updateDatConfig(dat, { name: "Test" }, accounts[2]),
        "CONTROL_ONLY"
      );
    });
  });
});
