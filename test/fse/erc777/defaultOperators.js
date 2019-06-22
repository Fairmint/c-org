const { deployDat, constants } = require("../../helpers");

contract("fse / erc777 / defaultOperators", () => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat();
  });

  it("should have no default operators", async () => {
    /**
     * Hard-coded to no default operators as we have not identified a compelling use
     * case for this and to simplify the token implementation.
     */
    const operators = await fse.defaultOperators();
    assert.equal(operators.length, 1);
    assert.equal(operators[0], constants.ZERO_ADDRESS);
  });
});
