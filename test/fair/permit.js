const { approveAll, deployDat } = require("../helpers");
const { ecsign } = require("ethereumjs-util");

// from https://github.com/Uniswap/uniswap-v2-core/blob/master/test/shared/utilities.ts
function getDomainSeparator(name, tokenAddress) {
  return web3.utils.keccak256(
    web3.eth.abi.encodeParameters.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        web3.utils.keccak256(
          web3.utils.hexToBytes(
            web3.utils.toHex(
              "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
            )
          )
        ),
        web3.utils.keccak256(web3.utils.hexToBytes(web3.utils.toHex(name))),
        web3.utils.keccak256(web3.utils.hexToBytes(web3.utils.toHex("1"))),
        1,
        tokenAddress,
      ]
    )
  );
}

async function getApprovalDigest(token, approve, nonce, deadline) {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address);
  return web3.utils.keccak256(
    solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      [
        "0x19",
        "0x01",
        DOMAIN_SEPARATOR,
        web3.utils.keccak256(
          web3.eth.abi.encodeParameters.encode(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [
              PERMIT_TYPEHASH,
              approve.owner,
              approve.spender,
              approve.value,
              nonce,
              deadline,
            ]
          )
        ),
      ]
    )
  );
}

contract("fair / permit", (accounts) => {
  let contracts;

  beforeEach(async () => {
    contracts = await deployDat(accounts, {
      initGoal: 0,
    });
    await approveAll(contracts, accounts);
  });

  describe("on permit", () => {
    beforeEach(async () => {
      const nonce = await contracts.dat.nonces(wallet.address);
      const deadline = MaxUint256;
      const digest = await getApprovalDigest(
        token,
        { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
        nonce,
        deadline
      );
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), "hex"),
        Buffer.from(wallet.privateKey.slice(2), "hex")
      );

      await contracts.dat.permit(
        wallet.address,
        other.address,
        TEST_AMOUNT,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      );
    });

    it("has allowance set", async () => {});
  });
});
