const { deployDat } = require("../../helpers");

contract("fair / erc20 / transfer", accounts => {
  let contracts;
  const initReserve = 1000;

  before(async () => {
    contracts = await deployDat(accounts, {
      initReserve,
      initGoal: 0
    });

    for (let i = 0; i < accounts.length; i++) {
      await contracts.erc1404.approve(accounts[i], true, {
        from: await contracts.dat.control()
      });
    }
  });

  it("has expected balance before transfer", async () => {
    assert.equal(
      (await contracts.fair.balanceOf(accounts[0])).toString(),
      initReserve
    );
    assert.equal(await contracts.fair.balanceOf(accounts[1]), 0);
  });

  describe("can transfer funds from initReserve", () => {
    const transferAmount = 42;

    before(async () => {
      await contracts.fair.transfer(accounts[1], transferAmount);
    });

    it("has expected after after transfer", async () => {
      assert.equal(
        (await contracts.fair.balanceOf(accounts[0])).toString(),
        initReserve - transferAmount
      );
      assert.equal(
        (await contracts.fair.balanceOf(accounts[1])).toString(),
        transferAmount
      );
    });

    it("should emit an event");

    describe("can transfer from other accounts", () => {
      it("todo");
    });
  });

  describe("can transfer tokens after buy", () => {
    it("todo");
  });

  it(
    "The function SHOULD throw if the message caller’s account balance does not have enough tokens to spend."
  );
  it(
    "Transfers of 0 values MUST be treated as normal transfers and fire the Transfer event."
  );
});
