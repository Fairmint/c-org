const { deployDat } = require("../datHelpers");
const { tokens } = require("hardlydifficult-eth");
const BigNumber = require("bignumber.js");

contract("dat / defaultMinInvestment", (accounts) => {
  let contracts;

  describe("ETH", () => {
    beforeEach(async () => {
      contracts = await deployDat(accounts, undefined, false, false);
    });

    it("should default to 100 ETH min investment", async () => {
      const actual = await contracts.dat.minInvestment();
      assert.equal(actual.toString(), web3.utils.toWei("100", "ether"));
    });
  });

  describe("USDC", () => {
    let token;

    beforeEach(async () => {
      token = await tokens.usdc.deploy(web3, accounts[9], accounts[8]);
      contracts = await deployDat(
        accounts,
        { currency: token.address },
        false,
        false
      );
    });

    it("should default to 100 USDC min investment", async () => {
      const actual = await contracts.dat.minInvestment();
      const expected = new BigNumber(100).shiftedBy(
        (await token.decimals()).toNumber()
      );
      assert.equal(actual.toString(), expected.toFixed());
    });
  });

  describe("DAI", () => {
    let token;

    beforeEach(async () => {
      token = await tokens.dai.deploy(web3, accounts[9]);
      contracts = await deployDat(
        accounts,
        { currency: token.address },
        false,
        false
      );
    });

    it("should default to 100 DAI min investment", async () => {
      const actual = await contracts.dat.minInvestment();
      const expected = new BigNumber(100).shiftedBy(
        (await token.decimals()).toNumber()
      );
      assert.equal(actual.toString(), expected.toFixed());
    });
  });
});
