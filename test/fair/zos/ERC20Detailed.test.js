const { deployDat } = require("../../datHelpers");
const { approveAll } = require("../../helpers");

// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

const { BN } = require("@openzeppelin/test-helpers");

const { expect } = require("chai");

contract("ERC20Detailed", function (accounts) {
  const _name = "My Detailed ERC20";
  const _symbol = "MDT";
  const _decimals = new BN(18);

  beforeEach(async function () {
    const contracts = await deployDat(accounts, {
      initGoal: 0,
      name: _name,
      symbol: _symbol,
    });
    await approveAll(contracts, accounts);
    this.token = contracts.dat;
  });

  it("has a name", async function () {
    expect(await this.token.name()).to.equal(_name);
  });

  it("has a symbol", async function () {
    expect(await this.token.symbol()).to.equal(_symbol);
  });

  it("has an amount of decimals", async function () {
    expect(await this.token.decimals()).to.be.bignumber.equal(_decimals);
  });
});
