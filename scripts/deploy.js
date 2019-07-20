const erc1820 = require("erc1820");
const { deployDat } = require("../helpers");
const fs = require("fs");

const testDaiArtifact = artifacts.require("TestDai");
const erc1820Artifact = artifacts.require("IERC1820Registry");

contract("deploy script", (accounts, network) => {
  const json = {};

  it("deploy", async () => {
    // Deploy 1820 (for local testing only)
    if (network === "development") {
      await erc1820.deploy(web3);
    }

    const currencyToken = await testDaiArtifact.new({from: accounts[0]});
    const contracts = {};
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

    json.erc1820 = {
      address: "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24",
      abi: erc1820Artifact.abi
    }
    json.proxyAdmin = {
      address: contracts.proxyAdmin.address,
      abi: contracts.proxyAdmin.abi
    };
    json.fair = {
      address: contracts.fair.address,
      abi: contracts.fair.abi
    };
    json.bigDiv = {
      address: contracts.bigDiv.address,
      abi: contracts.bigDiv.abi
    };
    json.currencyToken = {
      address: currencyToken.address, // TODO drop addresses for clarity?
      abi: currencyToken.abi
    };
    json.dat = {
      address: contracts.dat.address,
      abi: contracts.dat.abi
    };
    json.tpl = {
      address: contracts.tpl.address,
      abi: contracts.tpl.abi
    };
    json.auth = {
      address: contracts.auth.address,
      abi: contracts.auth.abi
    };
    if(contracts.vesting) {
      json.vesting = {
        abi: contracts.vesting[0].abi, // same for all
        accounts: []
      };
      for (let i = 0; i < contracts.vesting.length; i++) {
        json.vesting.accounts.push(contracts.vesting[i].address);
      }
    }

    // Test the upgrade process
    //await proxyAdmin.upgrade(fairProxy.address, fairContract.address);

    fs.writeFile(
      `contracts_${network}.json`,
      JSON.stringify(json, null, 2),
      () => {}
    );
  });
});
