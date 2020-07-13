const { deployDat } = require("../datHelpers");
const { approveAll, getApprovalDigest } = require("../helpers");
const { reverts } = require("truffle-assertions");
const { constants } = require("hardlydifficult-eth");
const { MockProvider } = require("ethereum-waffle");
const { ecsign } = require("ethereumjs-util");
const { hexlify, keccak256, toUtf8Bytes } = require("ethers/utils");
const BigNumber = require("bignumber.js");

const PERMIT_SELL_TYPEHASH = keccak256(
  toUtf8Bytes(
    "SellFor(address from,address to,uint256 quantityToSell,uint256 minCurrencyReturned,uint256 nonce,uint256 deadline)"
  )
);

async function getSellApprovalDigest(token, sell, nonce, deadline) {
  return getApprovalDigest(
    token,
    [
      "bytes32",
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
    ],
    [
      PERMIT_SELL_TYPEHASH,
      sell.from,
      sell.to,
      sell.quantityToSell,
      sell.minCurrencyReturned,
      nonce,
      deadline,
    ]
  );
}

contract("dat / sellFor", (accounts) => {
  let contracts;
  const provider = new MockProvider({
    hardfork: "istanbul",
    mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
    gasLimit: 9999999,
  });
  const [wallet, otherWallet] = provider.getWallets();
  const other = accounts[6];
  const TEST_AMOUNT = web3.utils.toWei("10", "ether");
  const sellOptions = {
    from: wallet.address,
    to: other,
    quantityToSell: TEST_AMOUNT,
    minCurrencyReturned: 1,
  };

  beforeEach(async () => {
    contracts = await deployDat(accounts, { initGoal: 0 });
    await approveAll(contracts, accounts);
    await contracts.whitelist.approveNewUsers([wallet.address], [4], {
      from: await contracts.dat.control(),
    });
    await web3.eth.sendTransaction({
      to: wallet.address,
      from: accounts[0],
      value: web3.utils.toWei("200", "ether"),
    });
    const value = web3.utils.toWei("100", "ether");
    const tx = await wallet.sign({
      to: contracts.dat.address,
      data: contracts.dat.contract.methods
        .buy(wallet.address, value, 1)
        .encodeABI(),
      gasLimit: 6000000,
      nonce: await web3.eth.getTransactionCount(wallet.address),
      value: "0x" + new BigNumber(value).toString(16),
    });
    await web3.eth.sendSignedTransaction(tx);
  });

  it("has the correct permit typehash", async () => {
    const actual = await contracts.dat.PERMIT_SELL_TYPEHASH();
    assert.equal(actual, PERMIT_SELL_TYPEHASH);
  });

  it("should fail if deadline is in the past", async () => {
    const nonce = (await contracts.dat.nonces(wallet.address)).toString();
    const deadline = "100";
    const digest = await getSellApprovalDigest(
      contracts.dat,
      sellOptions,
      nonce,
      deadline
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), "hex"),
      Buffer.from(wallet.privateKey.slice(2), "hex")
    );

    await reverts(
      contracts.dat.sellFor(
        sellOptions.from,
        sellOptions.to,
        sellOptions.quantityToSell,
        sellOptions.minCurrencyReturned,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      ),
      "EXPIRED"
    );
  });

  it("should fail if signed by the wrong account", async () => {
    const nonce = (await contracts.dat.nonces(wallet.address)).toString();
    const deadline = constants.MAX_UINT;
    const digest = await getSellApprovalDigest(
      contracts.dat,
      sellOptions,
      nonce,
      deadline
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), "hex"),
      Buffer.from(otherWallet.privateKey.slice(2), "hex")
    );

    await reverts(
      contracts.dat.sellFor(
        sellOptions.from,
        sellOptions.to,
        sellOptions.quantityToSell,
        sellOptions.minCurrencyReturned,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      ),
      "INVALID_SIGNATURE"
    );
  });

  describe("on permit", () => {
    let ethBefore, fairBefore;

    beforeEach(async () => {
      ethBefore = await web3.eth.getBalance(other);
      fairBefore = await contracts.dat.balanceOf(wallet.address);

      const nonce = (await contracts.dat.nonces(wallet.address)).toString();
      const deadline = constants.MAX_UINT;
      const digest = await getSellApprovalDigest(
        contracts.dat,
        sellOptions,
        nonce,
        deadline
      );
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), "hex"),
        Buffer.from(wallet.privateKey.slice(2), "hex")
      );

      await contracts.dat.sellFor(
        sellOptions.from,
        sellOptions.to,
        sellOptions.quantityToSell,
        sellOptions.minCurrencyReturned,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      );
    });

    it("ETH sent to", async () => {
      const actual = await web3.eth.getBalance(other);
      assert.notEqual(actual.toString(), ethBefore.toString());
      assert(new BigNumber(actual).isGreaterThan(ethBefore));
    });

    it("FAIR taken from", async () => {
      const actual = await contracts.dat.balanceOf(wallet.address);
      assert.equal(
        actual.toString(),
        new BigNumber(fairBefore).minus(TEST_AMOUNT).toString()
      );
    });
  });
});
