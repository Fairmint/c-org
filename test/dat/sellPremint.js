const BigNumber = require("bignumber.js");
const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");

contract("dat / sellPremint", (accounts) => {
  const [beneficiary, buyer, other] = accounts;
  const initReserve = web3.utils.toWei("10000", "ether");
  let buyAmount;
  const sellAmount = web3.utils.toWei("500", "ether");
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, { beneficiary, initReserve });
    await approveAll(contracts, accounts);
    await contracts.dat.transfer(other, initReserve, { from: beneficiary });

    const value = web3.utils.toWei("100", "ether");
    buyAmount = await contracts.dat.estimateBuyValue(value);
    await contracts.dat.buy(buyer, value, 1, { from: buyer, value });
    await contracts.dat.sell(other, sellAmount, 1, { from: other });
  });

  it("initReserve has been reduced by sellAmount", async () => {
    const actual = await contracts.dat.initReserve();
    const expected = new BigNumber(initReserve)
      .plus(buyAmount)
      .minus(sellAmount);
    assert.equal(actual.toString(), expected.toFixed());
  });
});
