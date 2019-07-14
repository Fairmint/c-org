const { deployDat } = require("../../helpers");

contract("fair / erc777 / defaultOperators", accounts => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
  });

  it("should have the dat as the default operator", async () => {
    const operators = await contracts.fair.defaultOperators();
    assert.equal(operators.length, 1);
    assert.equal(operators[0], contracts.dat.address);
  });
});
