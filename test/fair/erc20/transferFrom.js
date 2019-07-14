const { deployDat } = require("../../helpers");

contract("fair / erc20 / transferFrom", accounts => {
  let contracts;
  const initReserve = 1000;

  before(async () => {
    contracts = await deployDat(accounts, {
      initReserve,
      initGoal: 0
    });
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
      await contracts.fair.approve(accounts[2], -1);
      await contracts.fair.transferFrom(
        accounts[0],
        accounts[1],
        transferAmount,
        {
          from: accounts[2]
        }
      );
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
