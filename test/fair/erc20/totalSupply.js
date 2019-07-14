const { deployDat } = require("../../helpers");

contract("fair / erc20 / totalSupply", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, { initReserve: 0 });
  });

  it("defaults to 0", async () => {
    assert.equal((await contracts.fair.totalSupply()).toString(), 0);
  });

  it("goes up on mint");
  it("goes down on burn");
  it("no change on transfer");
});
