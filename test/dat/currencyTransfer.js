const BigNumber = require("bignumber.js");
const { deployDat } = require("../helpers");
const { tokens } = require("hardlydifficult-ethereum-contracts");
const { reverts } = require("truffle-assertions");

contract("dat / collectInvestment", (accounts) => {
  let contracts;
  const user = accounts[1];

  describe("ERC-20 DAT", () => {
    let token;
    let initialTokenBalance;

    beforeEach(async () => {
      token = await tokens.dai.deploy(web3, accounts[0]);
      contracts = await deployDat(accounts, { currency: token.address });
      initialTokenBalance = web3.utils.toWei("42", "ether");
      await token.mint(user, initialTokenBalance, {
        from: accounts[0],
      });
    });

    it("Users cannot send ETH to an ERC-20 DAT", async () => {
      await reverts(
        web3.eth.sendTransaction({
          to: contracts.dat.address,
          value: 1,
          from: user,
        }),
        "ONLY_FOR_CURRENCY_ETH"
      );
    });

    it("User has no FAIR", async () => {
      const balance = await contracts.dat.balanceOf(user);
      assert.equal(balance.toString(), "0");
    });

    it("DAT has no tokens yet", async () => {
      const balance = await token.balanceOf(contracts.dat.address);
      assert.equal(balance.toString(), "0");
    });

    it("buybackReserve is currently 0", async () => {
      const reserve = await contracts.dat.buybackReserve();
      assert.equal(reserve.toString(), "0");
    });

    describe("can transfer tokens into the contract", () => {
      const tokensToSend = web3.utils.toWei("1", "ether");

      beforeEach(async () => {
        await token.transfer(contracts.dat.address, tokensToSend, {
          from: user,
        });
      });

      it("User has no FAIR", async () => {
        const balance = await contracts.dat.balanceOf(user);
        assert.equal(balance.toString(), 0);
      });

      it("User spent tokens", async () => {
        const balance = await token.balanceOf(user);
        assert.equal(
          balance.toString(),
          new BigNumber(initialTokenBalance).minus(tokensToSend).toFixed()
        );
      });

      it("DAT has has tokens", async () => {
        const balance = await token.balanceOf(contracts.dat.address);
        assert.equal(balance.toString(), tokensToSend);
      });

      it("Tokens are reflected in the buybackReserve", async () => {
        const balance = await contracts.dat.buybackReserve();
        assert.equal(balance.toString(), tokensToSend);
      });
    });
  });

  describe("ETH DAT", () => {
    let initialETHBalance;

    beforeEach(async () => {
      contracts = await deployDat(accounts);
      initialETHBalance = await web3.eth.getBalance(user);
    });

    it("User has no FAIR", async () => {
      const balance = await contracts.dat.balanceOf(user);
      assert.equal(balance.toString(), "0");
    });

    it("DAT has no tokens yet", async () => {
      const balance = await web3.eth.getBalance(contracts.dat.address);
      assert.equal(balance.toString(), "0");
    });

    it("buybackReserve is currently 0", async () => {
      const reserve = await contracts.dat.buybackReserve();
      assert.equal(reserve.toString(), "0");
    });

    describe("can transfer tokens into the contract", () => {
      const ethToSend = web3.utils.toWei("1", "ether");

      beforeEach(async () => {
        await web3.eth.sendTransaction({
          to: contracts.dat.address,
          value: ethToSend,
          from: user,
        });
      });

      it("User has no FAIR", async () => {
        const balance = await contracts.dat.balanceOf(user);
        assert.equal(balance.toString(), 0);
      });

      it("User spent ETH", async () => {
        const balance = await web3.eth.getBalance(user);
        // User also spent some funds on gas
        assert(
          new BigNumber(initialETHBalance)
            .minus(ethToSend)
            .gt(balance.toString())
        );
      });

      it("DAT has has tokens", async () => {
        const balance = await web3.eth.getBalance(contracts.dat.address);
        assert.equal(balance.toString(), ethToSend);
      });

      it("Tokens are reflected in the buybackReserve", async () => {
        const balance = await contracts.dat.buybackReserve();
        assert.equal(balance.toString(), ethToSend);
      });
    });
  });
});
