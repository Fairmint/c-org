const getDomainSeparator = require("./getDomainSeparator");
const { keccak256, defaultAbiCoder, solidityPack } = require("ethers/utils");

// from https://github.com/Uniswap/uniswap-v2-core/blob/master/test/shared/utilities.ts
module.exports = async function getApprovalDigest(contract, types, data) {
  const name = await contract.name();
  const version = await contract.version();
  const DOMAIN_SEPARATOR = await getDomainSeparator(
    name,
    version,
    contract.address
  );
  return keccak256(
    solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      [
        "0x19",
        "0x01",
        DOMAIN_SEPARATOR,
        keccak256(defaultAbiCoder.encode(types, data)),
      ]
    )
  );
};
