const { deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / updateLockupLengths", accounts => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[5];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount
    });
  });

  it("Operator cannot updateLockupLengths", async () => {
    await reverts(
      contracts.whitelist.updateLockupLengths([0], [0], {
        from: operatorAccount
      }),
      "Ownable: caller is not the owner"
    );
  });

  describe("on updateLockupLengths", () => {
    beforeEach(async () => {
      await contracts.whitelist.updateLockupLengths([42, 43], [99, 100], {
        from: ownerAccount
      });
    });

    it("lockupLength updated 1", async () => {
      const lockupLength = await contracts.whitelist.lockupLength(42);
      assert.equal(lockupLength, 99);
    });

    it("lockupLength updated 2", async () => {
      const lockupLength = await contracts.whitelist.lockupLength(43);
      assert.equal(lockupLength, 100);
    });

    it("lockupLength default", async () => {
      const lockupLength = await contracts.whitelist.lockupLength(1);
      assert.equal(lockupLength, 0);
    });

    describe("on updateLockupLengths again", () => {
      beforeEach(async () => {
        await contracts.whitelist.updateLockupLengths([42, 43, 1], [0, 42, 1], {
          from: ownerAccount
        });
      });

      it("lockupLength updated 1", async () => {
        const lockupLength = await contracts.whitelist.lockupLength(42);
        assert.equal(lockupLength, 0);
      });

      it("lockupLength updated 2", async () => {
        const lockupLength = await contracts.whitelist.lockupLength(43);
        assert.equal(lockupLength, 42);
      });

      it("lockupLength updated 3", async () => {
        const lockupLength = await contracts.whitelist.lockupLength(1);
        assert.equal(lockupLength, 1);
      });
    });
  });
});
