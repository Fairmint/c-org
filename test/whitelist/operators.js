const { deployDat } = require("../helpers");
const truffleAssert = require("truffle-assertions");

contract("dat / whitelist / operators", (accounts) => {
  let contracts;
  let operatorAccount = accounts[5];

  beforeEach(async () => {
    contracts = await deployDat(accounts);
  });

  it("control is an operator by default", async () => {
    const isOperator = await contracts.whitelist.isOperator(
      await contracts.dat.control()
    );
    assert.equal(isOperator, true);
  });

  it("owner == control by default", async () => {
    const owner = await contracts.whitelist.owner();
    const control = await contracts.dat.control();
    assert.equal(owner, control);
  });

  it("other accounts are not operators", async () => {
    const isOperator = await contracts.whitelist.isOperator(operatorAccount);
    assert.equal(isOperator, false);
  });

  it("other accounts cannot add operators", async () => {
    await truffleAssert.reverts(
      contracts.whitelist.addOperator(operatorAccount, { from: accounts[4] }),
      "Ownable: caller is not the owner"
    );
  });

  it("other accounts cannot remove operators", async () => {
    await truffleAssert.reverts(
      contracts.whitelist.removeOperator(operatorAccount, {
        from: accounts[4],
      }),
      "Ownable: caller is not the owner"
    );
  });

  describe("after adding operators", () => {
    beforeEach(async () => {
      contracts.whitelist.addOperator(operatorAccount, {
        from: await contracts.whitelist.owner(),
      });
    });

    it("is now an operator", async () => {
      const isOperator = await contracts.whitelist.isOperator(operatorAccount);
      assert.equal(isOperator, true);
    });

    describe("after removing operators", () => {
      beforeEach(async () => {
        contracts.whitelist.removeOperator(operatorAccount, {
          from: await contracts.whitelist.owner(),
        });
      });

      it("is no longer an operator", async () => {
        const isOperator = await contracts.whitelist.isOperator(
          operatorAccount
        );
        assert.equal(isOperator, false);
      });
    });

    describe("after renouncing operators", () => {
      beforeEach(async () => {
        contracts.whitelist.renounceOperator({
          from: operatorAccount,
        });
      });

      it("is no longer an operator", async () => {
        const isOperator = await contracts.whitelist.isOperator(
          operatorAccount
        );
        assert.equal(isOperator, false);
      });
    });
  });
});
