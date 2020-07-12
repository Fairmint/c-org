const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");
const { reverts } = require("truffle-assertions");
const { constants } = require("hardlydifficult-ethereum-contracts");

contract("initializers", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts);
    await approveAll(contracts, accounts);
  });

  it("There are 2 public initializers", async () => {
    const count = contracts.dat.abi.filter(
      (x) => (x.name || "").toLowerCase() === "initialize"
    ).length;
    assert.equal(count, 2);
  });

  it("initialize may not be called again", async () => {
    await reverts(
      contracts.dat.initialize(
        1,
        constants.ZERO_ADDRESS,
        1,
        1,
        1,
        1,
        1,
        constants.ZERO_ADDRESS,
        "test",
        "test"
      ),
      "Contract instance has already been initialized"
    );
  });

  it("initialize(string, string, uint) may not be called", async () => {
    await reverts(
      contracts.dat.initialize("test", "test", 1),
      "Contract instance has already been initialized."
    );
  });
});
