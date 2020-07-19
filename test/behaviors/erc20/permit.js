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
/**
 * Requires `this.contract`
 */
module.exports = function (operator) {
  describe("Behavior / ERC20 / permit", function () {
    const provider = new MockProvider({
      hardfork: "istanbul",
      mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
      gasLimit: 9999999,
    });
    const [wallet, otherWallet] = provider.getWallets();
    const TEST_AMOUNT = "42";

    it("has the correct permit typehash", async function () {
      const actual = await this.contract.PERMIT_TYPEHASH();
      assert.equal(actual, PERMIT_TYPEHASH);
    });

    it("should fail if deadline is in the past", async function () {
      const nonce = (await this.contract.nonces(wallet.address)).toString();
      const deadline = "100";
      const digest = await getPermitApprovalDigest(
        this.contract,
        { owner: wallet.address, spender: operator, value: TEST_AMOUNT },
        nonce,
        deadline
      );
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), "hex"),
        Buffer.from(wallet.privateKey.slice(2), "hex")
      );

      await reverts(
        this.contract.permit(
          wallet.address,
          operator,
          TEST_AMOUNT,
          deadline,
          v,
          hexlify(r),
          hexlify(s)
        ),
        "EXPIRED"
      );
    });

    it("should fail if signed by the wrong account", async function () {
      const nonce = (await this.contract.nonces(wallet.address)).toString();
      const deadline = constants.MAX_UINT;
      const digest = await getPermitApprovalDigest(
        this.contract,
        { owner: wallet.address, spender: operator, value: TEST_AMOUNT },
        nonce,
        deadline
      );
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), "hex"),
        Buffer.from(otherWallet.privateKey.slice(2), "hex")
      );

      await reverts(
        this.contract.permit(
          wallet.address,
          operator,
          TEST_AMOUNT,
          deadline,
          v,
          hexlify(r),
          hexlify(s)
        ),
        "INVALID_SIGNATURE"
      );
    });

    describe("on permit", function () {
      beforeEach(async function () {
        const nonce = (await this.contract.nonces(wallet.address)).toString();
        const deadline = constants.MAX_UINT;
        const digest = await getPermitApprovalDigest(
          this.contract,
          { owner: wallet.address, spender: operator, value: TEST_AMOUNT },
          nonce,
          deadline
        );
        const { v, r, s } = ecsign(
          Buffer.from(digest.slice(2), "hex"),
          Buffer.from(wallet.privateKey.slice(2), "hex")
        );

        await this.contract.permit(
          wallet.address,
          operator,
          TEST_AMOUNT,
          deadline,
          v,
          hexlify(r),
          hexlify(s)
        );
      });

      it("has allowance set", async function () {
        const actual = await this.contract.allowance(wallet.address, operator);
        assert.equal(actual, TEST_AMOUNT);
      });
    });
  });
};
