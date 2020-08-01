const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");

const BigNumber = require("bignumber.js");
const behaviors = require("../behaviors");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { tokens } = require("hardlydifficult-eth");
const constants = require("../helpers/constants");

contract("wiki / close", (accounts) => {
  const [
    beneficiary,
    control,
    tokenOwner,
    investor,
    nonTokenHolder,
    operator,
  ] = accounts;
  let contracts;

  beforeEach(async function () {
    const usdc = await tokens.usdc.deploy(web3, control, tokenOwner);
    contracts = await deployDat(
      accounts,
      {
        initGoal: "0",
        control,
        beneficiary,
        currency: usdc.address,
      },
      true,
      false
    );

    await approveAll(contracts, accounts);

    // Mint tokens for testing
    const balance = new BigNumber("1000000").shiftedBy(
      parseInt(await usdc.decimals())
    );
    await usdc.mint(beneficiary, balance.toFixed(), { from: tokenOwner });
    await usdc.mint(investor, balance.toFixed(), { from: tokenOwner });

    // Approve spending by DAT
    await usdc.approve(contracts.dat.address, constants.MAX_UINT, {
      from: beneficiary,
    });
    await usdc.approve(contracts.dat.address, constants.MAX_UINT, {
      from: investor,
    });

    // Buy tokens
    const value = new BigNumber("100").shiftedBy(
      parseInt(await usdc.decimals())
    );
    await contracts.dat.buy(investor, value.toFixed(), 1, {
      from: investor,
    });

    await contracts.dat.close({
      from: beneficiary,
    });

    this.contract = contracts.dat;
  });

  behaviors.wiki.close.all(beneficiary, investor);

  it("can transfer on close", async function () {
    await this.contract.transfer(nonTokenHolder, "1", { from: tokenOwner });
  });

  it("can transferFrom on close", async function () {
    await this.contract.approve(operator, -1, { from: tokenOwner });
    await this.contract.transferFrom(tokenOwner, nonTokenHolder, "1", {
      from: operator,
    });
  });
});
