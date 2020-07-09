const { deployDat, getDomainSeparator } = require("../helpers");

contract("dat / domainSeparator", (accounts) => {
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts);
  });

  it("has the correct domain separator", async () => {
    const expected = await getDomainSeparator(
      await contracts.dat.name(),
      await contracts.dat.version(),
      await contracts.dat.address
    );
    const actual = await contracts.dat.DOMAIN_SEPARATOR();
    assert.equal(actual, expected);
  });
});
