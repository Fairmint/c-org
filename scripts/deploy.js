const erc1820 = require("erc1820");
const { deployDat } = require("../helpers");
const fs = require("fs");

const testDaiArtifact = artifacts.require("TestDai");
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
    abiJson.erc1820 = erc1820Artifact.abi;
    // TODO address: "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24",
    abiJson.proxyAdmin = contracts.proxyAdmin.abi;
    //address: contracts.proxyAdmin.address,
    abiJson.fair = contracts.fair.abi;
    //address: contracts.fair.address,
    abiJson.bigDiv = contracts.bigDiv.abi;
    //address: contracts.bigDiv.address,
    abiJson.erc20 = currencyToken.abi;
    // currencyToken.address, // TODO drop addresses for clarity?
    // TODO these contracts will be removed
    // abiJson.dat = contracts.dat.abi;
    // // address: contracts.dat.address,
    // abiJson.tpl = contracts.tpl.abi;
    // // address: contracts.tpl.address,
    // abiJson.auth = contracts.auth.abi;
    // address: contracts.auth.address,
    abiJson.vesting = vestingArtifact.abi;
    // if (contracts.vesting) {
    //   for (let i = 0; i < contracts.vesting.length; i++) {
    //     abiJson.vesting.accounts.push(contracts.vesting[i].address);
    //   }
    // }

    // Test the upgrade process
    //await proxyAdmin.upgrade(fairProxy.address, fairContract.address);

    fs.writeFile(
      `c-org-abi/abi.json`,
      JSON.stringify(abiJson, null, 2),
      () => {}
    );
  });
});
