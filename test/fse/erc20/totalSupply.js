const { deployDat } = require("../../helpers");

contract("fse / erc20 / totalSupply", () => {
  let dat;
  const initReserve = 42;

  before(async () => {
    dat = await deployDat({ initReserve });
  });

  it("defaults to initReserve", async () => {
    assert.equal((await dat.totalSupply()).toString(), initReserve);
  });

  it("goes up on buy");
  it("goes down on sell");
  it("goes down on burn");
  it("no change on transfer");
});
