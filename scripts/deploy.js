const erc1820 = require("erc1820");
const { deployDat } = require("../helpers");
const fs = require("fs");

const testDaiArtifact = artifacts.require("TestDai");
const testUsdcArtifact = artifacts.require("TestUsdc");
const erc1820Artifact = artifacts.require("IERC1820Registry");
const vestingArtifact = artifacts.require("Vesting");

contract("deploy script", (accounts, network) => {
  it("deploy", async () => {
    // Deploy 1820 (for local testing only)
    if (network === "development") {
      await erc1820.deploy(web3);
    }

    const currencyToken = await testDaiArtifact.new({ from: accounts[0] });
    const contracts = await deployDat(accounts, {
      currency: currencyToken.address,
      name: "Fairmint Fair Synthetic Equity",
      symbol: "FAIR",
      vesting: [
        {
          address: accounts[0],
          value: "40000000000000000000"
        },
        {
          address: "0x7a23608a8ebe71868013bda0d900351a83bb4dc2",
          value: "1000000000000000000"
        },
        {
          address: "0xdb92C096bc5Efa8aDB48F05CD601DDdb75228203",
          value: "1000000000000000000"
        }
      ]
    });

    const abiJson = {};
    const bytecodeJson = {};
    abiJson.erc1820 = erc1820Artifact.abi;
    abiJson.proxyAdmin = contracts.proxyAdmin.abi;
    bytecodeJson.proxyAdmin = contracts.proxyAdmin.bytecode;
    console.log(`ProxyAdmin: ${contracts.proxyAdmin.address}`);
    abiJson.fair = contracts.fair.abi;
    bytecodeJson.fair = contracts.fair.bytecode;
    console.log(`FAIR token: ${contracts.fair.address}`);
    abiJson.bigDiv = contracts.bigDiv.abi;
    bytecodeJson.bigDiv = contracts.bigDiv.bytecode;
    abiJson.erc20 = currencyToken.abi;
    bytecodeJson.testDai = testDaiArtifact.bytecode;
    bytecodeJson.testUsdc = testUsdcArtifact.bytecode;

    console.log(
      `Currency: ${currencyToken.address} (${await currencyToken.symbol()})`
    );
    abiJson.vesting = vestingArtifact.abi;
    bytecodeJson.vesting = vestingArtifact.bytecode;
    if (contracts.vesting) {
      for (let i = 0; i < contracts.vesting.length; i++) {
        console.log(
          `Vesting: ${
            contracts.vesting[i].address
          } for ${await contracts.vesting[i].beneficiary()}`
        );
      }
    }

    // Test the upgrade process
    //await proxyAdmin.upgrade(fairProxy.address, fairContract.address);

    fs.writeFile(
      `c-org-abi/abi.json`,
      JSON.stringify(abiJson, null, 2),
      () => {}
    );
    fs.writeFile(
      `c-org-abi/bytecode.json`,
      JSON.stringify(bytecodeJson, null, 2),
      () => {}
    );
  });
});
