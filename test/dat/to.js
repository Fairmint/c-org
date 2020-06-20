const BigNumber = require("bignumber.js");
const { approveAll, deployDat, getGasCost } = require("../helpers");

contract("dat / to", (accounts) => {
  let contracts;
  const currencyHolder = accounts[3];
  const fairHolder = accounts[4];

  beforeEach(async () => {
    contracts = await deployDat(
      accounts,
      {
        initGoal: "0", // Start in the run state
      },
      false
    );

    await approveAll(contracts, accounts);
  });

  describe("buy", () => {
    const amount = "420000000000000000000";
    let fairHolderBalanceBefore;
    let currencyHolderBalanceBefore;
    let tokensIssued;
    let gasPaid;

    beforeEach(async () => {
      fairHolderBalanceBefore = new BigNumber(
        await contracts.dat.balanceOf(fairHolder)
      );
      currencyHolderBalanceBefore = new BigNumber(
        await web3.eth.getBalance(currencyHolder)
      );
      tokensIssued = new BigNumber(
        await contracts.dat.estimateBuyValue(amount)
      );
      const tx = await contracts.dat.buy(fairHolder, amount, 1, {
        from: currencyHolder,
        value: amount,
      });
      gasPaid = await getGasCost(tx);
    });

    it("sanity check, tokensIssued > 0", async () => {
      assert.notEqual(tokensIssued.toFixed(), 0);
    });

    it("currencyHolder's balance went down", async () => {
      const balance = new BigNumber(await web3.eth.getBalance(currencyHolder));
      assert.equal(
        balance.toFixed(),
        currencyHolderBalanceBefore.minus(amount).minus(gasPaid).toFixed()
      );
    });

    it("fairHolder's balance went up", async () => {
      const balance = new BigNumber(await contracts.dat.balanceOf(fairHolder));
      assert.equal(
        balance.toFixed(),
        fairHolderBalanceBefore.plus(tokensIssued).toFixed()
      );
    });

    describe("sell", () => {
      const amount = "100000000000000000";
      let fairHolderBalanceBefore;
      let currencyHolderBalanceBefore;
      let currencyReturned;

      beforeEach(async () => {
        fairHolderBalanceBefore = new BigNumber(
          await contracts.dat.balanceOf(fairHolder)
        );
        currencyHolderBalanceBefore = new BigNumber(
          await web3.eth.getBalance(currencyHolder)
        );
        currencyReturned = new BigNumber(
          await contracts.dat.estimateSellValue(amount)
        );
        await contracts.dat.sell(currencyHolder, amount, 1, {
          from: fairHolder,
        });
      });

      it("sanity check, currencyReturned > 0", async () => {
        assert.notEqual(currencyReturned.toFixed(), 0);
      });

      it("currencyHolder's balance went up", async () => {
        const balance = new BigNumber(
          await web3.eth.getBalance(currencyHolder)
        );
        assert.equal(
          balance.toFixed(),
          currencyHolderBalanceBefore.plus(currencyReturned).toFixed()
        );
      });

      it("fairHolder's balance went down", async () => {
        const balance = new BigNumber(
          await contracts.dat.balanceOf(fairHolder)
        );
        assert.equal(
          balance.toFixed(),
          fairHolderBalanceBefore.minus(amount).toFixed()
        );
      });
    });
  });
});
