const erc1820 = require("erc1820");
const { deployDat } = require("../helpers");
const fs = require("fs");

const testDaiArtifact = artifacts.require("TestDai");
const testUsdcArtifact = artifacts.require("TestUsdc");
const erc1820Artifact = artifacts.require("IERC1820Registry");
const proxyArtifact = artifacts.require("UpgradeableProxy");
const erc1404Artifact = artifacts.require("TestERC1404");
const vestingArtifact = artifacts.require("TokenVesting");

contract("deploy script", (accounts, network) => {
  it("deploy", async () => {
    const addresses = fs.readFileSync("c-org-abi/addresses.json")[network] || {};

    // Deploy 1820 (for local testing only)
    if (network === "development") {
      await erc1820.deploy(web3);
    }

    let currencyToken;
    if (addresses.dai) {
      currencyToken = await testDaiArtifact.at(addresses.dai);
    } else {
      currencyToken = await testDaiArtifact.new({ from: accounts[0] });

      console.log(
        `Deployed currency: ${
          currencyToken.address
        } (${await currencyToken.symbol()})`
      );
    }
    const contracts = await deployDat(accounts, {
      bigDivAddress: addresses.bigDiv,
      erc1404Address: addresses.erc1404,
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
    abiJson.erc1404 = contracts.erc1404.abi;
    abiJson.proxyAdmin = contracts.proxyAdmin.abi;
    bytecodeJson.proxyAdmin = contracts.proxyAdmin.bytecode;
    bytecodeJson.proxy = proxyArtifact.bytecode;
    console.log(`ProxyAdmin: ${contracts.proxyAdmin.address}`);
    abiJson.fair = contracts.fair.abi;
    bytecodeJson.fair = contracts.fair.bytecode;
    bytecodeJson.dat = contracts.dat.bytecode;
    console.log(`FAIR token: ${contracts.fair.address}`);
    abiJson.bigDiv = contracts.bigDiv.abi;
    abiJson.erc20 = currencyToken.abi;

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
