const { approveAll, deployDat } = require("../../helpers");

contract("fair / erc20 / transfer", accounts => {
  let contracts;
  const initReserve = 1000;

  before(async () => {
    contracts = await deployDat(accounts, {
      initReserve,
      initGoal: 0
    });
    await approveAll(contracts, accounts);
  });

  it("has expected balance before transfer", async () => {
    assert.equal(
      (await contracts.dat.balanceOf(accounts[0])).toString(),
      initReserve
    );
    assert.equal(await contracts.dat.balanceOf(accounts[1]), 0);
  });

  describe("can transfer funds from initReserve", () => {
    const transferAmount = 42;

    before(async () => {
      await contracts.dat.transfer(accounts[1], transferAmount);
    });

    it("has expected after after transfer", async () => {
      assert.equal(
        (await contracts.dat.balanceOf(accounts[0])).toString(),
        initReserve - transferAmount
      );
      assert.equal(
        (await contracts.dat.balanceOf(accounts[1])).toString(),
        transferAmount
      );
    });
  });
});
