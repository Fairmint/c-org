const { approveAll, deployDat } = require("../helpers");
const { tokens } = require("hardlydifficult-ethereum-contracts");
const { constants } = require("../helpers");

contract("dat / buybackReserve", accounts => {
  let contracts;
  let token;

  before(async () => {
    token = await tokens.sai.deploy(web3, accounts[0]);
    contracts = await deployDat(accounts, { currency: token.address });
    await approveAll(contracts, accounts);
  });

  it("buybackReserve should be 0 by default", async () => {
    const reserve = await contracts.dat.buybackReserve();
    assert.equal(reserve, 0);
  });

  describe("once excessive reserve", () => {
    before(async () => {
      await token.mint(contracts.dat.address, constants.MAX_UINT, {
        from: accounts[0]
      });
    });

    it("buybackReserve should report as <= sqrt(MAX_UINT)", async () => {
      const reserve = await contracts.dat.buybackReserve();
      assert.equal(reserve, "340282366920938463463374607431768211455");
    });
  });
});
