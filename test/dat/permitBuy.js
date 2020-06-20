const { approveAll, deployDat } = require("../helpers");
const { getApprovalDigest } = require("../../helpers");
const { reverts } = require("truffle-assertions");
const { constants, tokens } = require("hardlydifficult-eth");
const { MockProvider } = require("ethereum-waffle");
const { ecsign } = require("ethereumjs-util");
const { hexlify, keccak256, toUtf8Bytes } = require("ethers/utils");
const BigNumber = require("bignumber.js");

const PERMIT_BUY_TYPEHASH = keccak256(
  toUtf8Bytes(
    "permitBuy(address _from,address _to,uint256 _currencyValue, uint256 _minTokensBought,uint256 _nonce,uint256 _deadline)"
  )
);

async function getBuyApprovalDigest(token, buy, nonce, deadline) {
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
      PERMIT_BUY_TYPEHASH,
      buy.from,
      buy.to,
      buy.currencyValue,
      buy.minTokensBought,
      nonce,
      deadline,
    ]
  );
}

contract("dat / permitBuy", (accounts) => {
  let contracts, usdc;
  const tokenOwner = accounts[8];
  const provider = new MockProvider({
    hardfork: "istanbul",
    mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
    gasLimit: 9999999,
  });
  const [wallet, otherWallet] = provider.getWallets();
  const other = accounts[6];
  const TEST_AMOUNT = web3.utils.toWei("100", "ether");
  const buyOptions = {
    from: wallet.address,
    to: other,
    currencyValue: TEST_AMOUNT,
    minTokensBought: 1,
  };

  beforeEach(async () => {
    usdc = await tokens.usdc.deploy(web3, accounts[9], tokenOwner);
    await usdc.mint(wallet.address, web3.utils.toWei("1000", "ether"), {
      from: tokenOwner,
    });
    contracts = await deployDat(accounts, { currency: usdc.address });
    const tx = await wallet.sign({
      to: usdc.address,
      data: usdc.contract.methods
        .approve(contracts.dat.address, -1)
        .encodeABI(),
      gasLimit: 6000000,
      nonce: await web3.eth.getTransactionCount(wallet.address),
    });
    await web3.eth.sendSignedTransaction(tx);
    await approveAll(contracts, accounts);
  });

  it("has the correct permit typehash", async () => {
    const actual = await contracts.dat.PERMIT_BUY_TYPEHASH();
    assert.equal(actual, PERMIT_BUY_TYPEHASH);
  });

  it("should fail if deadline is in the past", async () => {
    const nonce = (await contracts.dat.nonces(wallet.address)).toString();
    const deadline = "100";
    const digest = await getBuyApprovalDigest(
      contracts.dat,
      buyOptions,
      nonce,
      deadline
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), "hex"),
      Buffer.from(wallet.privateKey.slice(2), "hex")
    );

    await reverts(
      contracts.dat.permitBuy(
        buyOptions.from,
        buyOptions.to,
        buyOptions.currencyValue,
        buyOptions.minTokensBought,
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
    const digest = await getBuyApprovalDigest(
      contracts.dat,
      buyOptions,
      nonce,
      deadline
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), "hex"),
      Buffer.from(otherWallet.privateKey.slice(2), "hex")
    );

    await reverts(
      contracts.dat.permitBuy(
        buyOptions.from,
        buyOptions.to,
        buyOptions.currencyValue,
        buyOptions.minTokensBought,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      ),
      "INVALID_SIGNATURE"
    );
  });

  describe("on permit", () => {
    let tokensBefore, fairBefore;

    beforeEach(async () => {
      tokensBefore = await usdc.balanceOf(wallet.address);
      fairBefore = await contracts.dat.balanceOf(other);

      const nonce = (await contracts.dat.nonces(wallet.address)).toString();
      const deadline = constants.MAX_UINT;
      const digest = await getBuyApprovalDigest(
        contracts.dat,
        buyOptions,
        nonce,
        deadline
      );
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), "hex"),
        Buffer.from(wallet.privateKey.slice(2), "hex")
      );

      await contracts.dat.permitBuy(
        buyOptions.from,
        buyOptions.to,
        buyOptions.currencyValue,
        buyOptions.minTokensBought,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      );
    });

    it("tokens taken from", async () => {
      const actual = await usdc.balanceOf(wallet.address);
      assert.equal(
        actual.toString(),
        new BigNumber(tokensBefore).minus(TEST_AMOUNT).toString()
      );
    });

    it("FAIR issued to", async () => {
      const actual = await contracts.dat.balanceOf(other);
      assert.notEqual(actual.toString(), fairBefore.toString());
      assert(new BigNumber(actual).isGreaterThan(fairBefore));
    });
  });
});
