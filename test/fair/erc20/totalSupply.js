const { deployDat } = require("../../helpers");

contract("fair / erc20 / totalSupply", accounts => {
  let fair;

  before(async () => {
    fair = (await deployDat({ initReserve: 0 }, accounts[0]))[1];
  });

  it("defaults to 0", async () => {
    assert.equal((await fair.totalSupply()).toString(), 0);
  });

  it("goes up on mint");
  it("goes down on burn");
  it("no change on transfer");
});
