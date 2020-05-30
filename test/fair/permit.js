const { approveAll, deployDat } = require("../helpers");
const { getApprovalDigest } = require("../../helpers");
const { reverts } = require("truffle-assertions");
const { constants } = require("hardlydifficult-eth");
const { MockProvider } = require("ethereum-waffle");
const { ecsign } = require("ethereumjs-util");
const { hexlify, keccak256, toUtf8Bytes } = require("ethers/utils");

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes(
    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
  )
);

async function getPermitApprovalDigest(token, approve, nonce, deadline) {
  return getApprovalDigest(
    token,
    ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
    [
      PERMIT_TYPEHASH,
      approve.owner,
      approve.spender,
      approve.value,
      nonce,
      deadline,
    ]
  );
}

contract("fair / permit", (accounts) => {
  let contracts;
  const provider = new MockProvider({
    hardfork: "istanbul",
    mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
    gasLimit: 9999999,
  });
  const [wallet, otherWallet] = provider.getWallets();
  const other = accounts[6];
  const TEST_AMOUNT = "42";

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0,
    });
    await approveAll(contracts, accounts);
  });

  it("has the correct permit typehash", async () => {
    const actual = await contracts.dat.PERMIT_TYPEHASH();
    assert.equal(actual, PERMIT_TYPEHASH);
  });

  it("should fail if deadline is in the past", async () => {
    const nonce = (await contracts.dat.nonces(wallet.address)).toString();
    const deadline = "100";
    const digest = await getPermitApprovalDigest(
      contracts.dat,
      { owner: wallet.address, spender: other, value: TEST_AMOUNT },
      nonce,
      deadline
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), "hex"),
      Buffer.from(wallet.privateKey.slice(2), "hex")
    );

    await reverts(
      contracts.dat.permit(
        wallet.address,
        other,
        TEST_AMOUNT,
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
    const digest = await getPermitApprovalDigest(
      contracts.dat,
      { owner: wallet.address, spender: other, value: TEST_AMOUNT },
      nonce,
      deadline
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), "hex"),
      Buffer.from(otherWallet.privateKey.slice(2), "hex")
    );

    await reverts(
      contracts.dat.permit(
        wallet.address,
        other,
        TEST_AMOUNT,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      ),
      "INVALID_SIGNATURE"
    );
  });

  describe("on permit", () => {
    beforeEach(async () => {
      const nonce = (await contracts.dat.nonces(wallet.address)).toString();
      const deadline = constants.MAX_UINT;
      const digest = await getPermitApprovalDigest(
        contracts.dat,
        { owner: wallet.address, spender: other, value: TEST_AMOUNT },
        nonce,
        deadline
      );
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), "hex"),
        Buffer.from(wallet.privateKey.slice(2), "hex")
      );

      await contracts.dat.permit(
        wallet.address,
        other,
        TEST_AMOUNT,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      );
    });

    it("has allowance set", async () => {
      const actual = await contracts.dat.allowance(wallet.address, other);
      assert.equal(actual, TEST_AMOUNT);
    });
  });
});
