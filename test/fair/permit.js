const { approveAll, deployDat } = require("../helpers");
const { constants } = require("hardlydifficult-eth");
const Web3 = require("web3");
const { MockProvider } = require("ethereum-waffle");
const { ecsign } = require("ethereumjs-util");
const {
  BigNumber,
  bigNumberify,
  hexlify,
  getAddress,
  keccak256,
  defaultAbiCoder,
  toUtf8Bytes,
  solidityPack,
} = require("ethers/utils");

// from https://github.com/Uniswap/uniswap-v2-core/blob/master/test/shared/utilities.ts
const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes(
    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
  )
);

async function getDomainSeparator(name, version, tokenAddress) {
  // the old web3 version does not have this function
  let chainId = await new Web3(web3).eth.getChainId();
  if (chainId === 1337) {
    // Ganache uses chainId 1
    chainId = 1;
  }
  return keccak256(
    defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        keccak256(
          toUtf8Bytes(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          )
        ),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes(version)),
        chainId,
        tokenAddress,
      ]
    )
  );
}

async function getApprovalDigest(token, approve, nonce, deadline) {
  const name = await token.name();
  const version = await token.version();
  const DOMAIN_SEPARATOR = await getDomainSeparator(
    name,
    version,
    token.address
  );
  return keccak256(
    solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      [
        "0x19",
        "0x01",
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
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

  it("has the correct domain separator", async () => {
    const expected = await getDomainSeparator(
      await contracts.dat.name(),
      await contracts.dat.version(),
      await contracts.dat.address
    );
    const actual = await contracts.dat.DOMAIN_SEPARATOR();
    assert.equal(actual, expected);
  });

  it("has the correct permit typehash", async () => {
    const actual = await contracts.dat.PERMIT_TYPEHASH();
    assert.equal(actual, PERMIT_TYPEHASH);
  });

  describe("on permit", () => {
    const provider = new MockProvider({
      hardfork: "istanbul",
      mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
      gasLimit: 9999999,
    });
    const [wallet] = provider.getWallets();
    const other = accounts[6];
    const TEST_AMOUNT = "42";

    beforeEach(async () => {
      const nonce = (await contracts.dat.nonces(wallet.address)).toString();
      const deadline = constants.MAX_UINT;
      const digest = await getApprovalDigest(
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
