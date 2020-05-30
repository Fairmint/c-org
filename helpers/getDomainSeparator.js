const Web3 = require("web3");
const { keccak256, defaultAbiCoder, toUtf8Bytes } = require("ethers/utils");

module.exports = async function getDomainSeparator(
  name,
  version,
  tokenAddress
) {
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
};
