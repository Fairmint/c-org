const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");
const { reverts } = require("truffle-assertions");
const { constants } = require("hardlydifficult-eth");

contract("fair / burnFrom", (accounts) => {
  let contracts;
  const burnAmount = 20;

  before(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0,
    });
    await approveAll(contracts, accounts);

    await contracts.dat.buy(accounts[1], "420000000000000000000", 1, {
      value: "420000000000000000000",
      from: accounts[1],
    });
  });

  it("should fail to burnFrom without approval", async () => {
    await reverts(
      contracts.dat.burnFrom(accounts[0], burnAmount, { from: accounts[1] }),
      "ERC20: burn amount exceeds allowance"
    );
  });

  describe("can burn", () => {
    let accountBalanceBefore;

    before(async () => {
      accountBalanceBefore = await contracts.dat.balanceOf(accounts[0]);
      await contracts.dat.approve(accounts[1], constants.MAX_UINT, {
        from: accounts[0],
      });
      await contracts.dat.burnFrom(accounts[0], burnAmount, {
        from: accounts[1],
      });
    });

    it("account balance went down", async () => {
      assert.equal(
        (await contracts.dat.balanceOf(accounts[0])).toString(),
        accountBalanceBefore.subn(burnAmount).toString()
      );
    });
  });
});
