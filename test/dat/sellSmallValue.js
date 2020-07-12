const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");

/*
Testing the following scenario, which was a bug in version <= 2:
  state == RUN
  reserve == 15672691058
  totalSupply == 317046271116763072800229
  burnedSupply == 0
  quantityToSell == 1
  estimatedSellValue == 0 (was MAX_UINT)
 */
contract("dat / sellSmallValue", (accounts) => {
  let contracts;

  before(async () => {
    contracts = await deployDat(accounts, {
      initReserve: "317046271116763072800229",
      buySlopeNum: "1",
      buySlopeDen: "100000000000000000000000",
    });
    await approveAll(contracts, accounts);

    // Transfer ETH to set the correct buybackReserve
    await web3.eth.sendTransaction({
      to: contracts.dat.address,
      value: "15672691058",
      from: accounts[0],
    });
  });

  it("is in the correct state", async () => {
    const actual = await contracts.dat.state();
    assert.equal(actual.toString(), "1");
  });

  it("has correct reserve", async () => {
    const actual = await contracts.dat.buybackReserve();
    assert.equal(actual.toString(), "15672691058");
  });

  it("has correct totalSupply", async () => {
    const actual = await contracts.dat.totalSupply();
    assert.equal(actual.toString(), "317046271116763072800229");
  });

  it("has correct burnedSupply", async () => {
    const actual = await contracts.dat.burnedSupply();
    assert.equal(actual.toString(), "0");
  });

  it("estimateSellValue is correct", async () => {
    const actual = await contracts.dat.estimateSellValue("1");
    assert.equal(actual.toString(), "0");
  });
});
