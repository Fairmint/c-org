const { deployDat } = require("../../helpers");

contract("fair / erc777 / defaultOperators", accounts => {
  let dat;
  let fair;

  before(async () => {
    [dat, fair] = await deployDat(undefined, accounts[0]);
  });

  it("should have the dat as the default operator", async () => {
    const operators = await fair.defaultOperators();
    assert.equal(operators.length, 1);
    assert.equal(operators[0], dat.address);
  });
});
