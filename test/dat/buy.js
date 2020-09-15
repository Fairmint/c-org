/**
 * Tests the ability to buy dat tokens
 */

const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

contract("dat / buy", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
    await approveAll(contracts, accounts);
  });

  it("balanceOf should be 0 by default", async () => {
    const balance = await contracts.dat.balanceOf(accounts[1]);

    assert.equal(balance, 0);
  });

  it("shouldFail with INCORRECT_MSG_VALUE", async () => {
    await expectRevert(
      contracts.dat.buy(accounts[1], "100000000000000000001", 1, {
        value: "100000000000000000000",
        from: accounts[1],
      }),
      "INCORRECT_MSG_VALUE"
    );
  });

  describe("can buy tokens", () => {
    before(async () => {
      await contracts.dat.buy(accounts[1], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[1],
      });
    });

    it("balanceOf should have increased", async () => {
      const balance = await contracts.dat.balanceOf(accounts[1]);

      assert.equal(balance.toString(), "141421356237309504880");
    });
  });
});
