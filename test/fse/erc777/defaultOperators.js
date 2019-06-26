const { deployDat } = require("../../helpers");

contract("fse / erc777 / defaultOperators", accounts => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat(undefined, accounts[0]);
  });

  it("should have the dat as the default operator", async () => {
    const operators = await fse.defaultOperators();
    assert.equal(operators.length, 1);
    assert.equal(operators[0], dat.address);
  });
});
