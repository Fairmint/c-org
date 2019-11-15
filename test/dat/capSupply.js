const { approveAll, deployDat } = require("../helpers");
const { tokens } = require("hardlydifficult-ethereum-contracts");
const { constants, shouldFail } = require("../helpers");

contract("dat / capSupply", accounts => {
  let contracts;
  let token;

  before(async () => {
    token = await tokens.dai.deploy(web3, accounts[0]);
    contracts = await deployDat(accounts, { currency: token.address });
    await approveAll(contracts, accounts);
    await token.mint(accounts[1], constants.MAX_UINT, {
      from: accounts[0]
    });
    await token.approve(contracts.dat.address, constants.MAX_UINT, {
      from: accounts[1]
    });
    await contracts.dat.buy(
      accounts[1],
      "30000000000000000000000000000000000000000000000000000000",
      1,
      {
        from: accounts[1]
      }
    );
  });

  it("supply is near cap", async () => {
    const reserve = await contracts.dat.totalSupply();
    assert.equal(reserve.toString(), "77459666924148337703585307995647992228");
  });

  it("buying over cap shouldFail", async () => {
    await shouldFail(
      contracts.dat.buy(
        accounts[1],
        "30000000000000000000000000000000000000000000000000000000",
        1,
        {
          from: accounts[1]
        }
      ),
      "EXCESSIVE_SUPPLY"
    );
  });
});
