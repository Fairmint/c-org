const { deployDat } = require("../datHelpers");
const { reverts } = require("truffle-assertions");

contract("dat / whitelist / startDate", (accounts) => {
  let contracts;
  let ownerAccount;
  let operatorAccount = accounts[5];
  const trader = accounts[6];
  let startDate;

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.addOperator(operatorAccount, {
      from: ownerAccount,
    });
    await contracts.whitelist.approveNewUsers([trader], [4], {
      from: operatorAccount,
    });
    startDate = Math.round(Date.now() / 1000) + 30;
    await contracts.whitelist.configWhitelist(startDate, 84, {
      from: ownerAccount,
    });
  });

  it("startDate updated", async () => {
    assert.equal(await contracts.whitelist.startDate(), startDate);
  });

  it("cannot buy when startDate is in the future", async () => {
    const price = web3.utils.toWei("100", "ether");
    await reverts(
      contracts.dat.buy(trader, price, 1, {
        from: trader,
        value: price,
      }),
      "WAIT_FOR_START_DATE"
    );
  });

  describe("on config again", () => {
    beforeEach(async () => {
      startDate = Math.round(Date.now() / 1000) - 1;
      await contracts.whitelist.configWhitelist(startDate, 0, {
        from: ownerAccount,
      });
    });

    it("startDate updated", async () => {
      assert.equal(await contracts.whitelist.startDate(), startDate);
    });

    it("can buy when startDate is in the past", async () => {
      const price = web3.utils.toWei("100", "ether");
      await contracts.dat.buy(trader, price, 1, {
        from: trader,
        value: price,
      });
    });
  });
});
