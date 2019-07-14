const erc1820 = require("erc1820");
const { deployDat } = require("../helpers");
const fs = require("fs");

const testDaiArtifact = artifacts.require("TestDai");

contract("deploy script", (accounts, network) => {
  const json = {};

  it("deploy", async () => {
    // Deploy 1820 (for local testing only)
    if (network === "development") {
      await erc1820.deploy(web3);
    }

    const dai = await testDaiArtifact.new();
    const contracts = await deployDat(accounts, {
      currency: dai.address,
      name: "Fairmint Fair Synthetic Equity",
      symbol: "FAIR",
      vesting: [
        {
          address: accounts[0],
          value: 40000000000000000000
        },
        {
          address: "0x7a23608a8ebe71868013bda0d900351a83bb4dc2",
          value: 1000000000000000000
        },
        {
          address: "0xdb92C096bc5Efa8aDB48F05CD601DDdb75228203",
          value: 1000000000000000000
        }
      ]
    });

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
    json.dai = {
      address: contracts.dai.address,
      abi: contracts.dai.abi
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
    json.vesting = {
      abi: contracts.vestingBeneficiary.abi, // same for all
      accounts: []
    };
    for (let i = 0; i < contracts.vesting.length; i++) {
      json.vesting.accounts.push(contracts.vesting[i].address);
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
