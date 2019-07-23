const erc1820 = require("erc1820");
const { deployDat } = require("../helpers");
const fs = require("fs");

const testDaiArtifact = artifacts.require("TestDai");
const testUsdcArtifact = artifacts.require("TestUsdc");
const erc1820Artifact = artifacts.require("IERC1820Registry");
const proxyArtifact = artifacts.require("AdminUpgradeabilityProxy");
const erc1404Artifact = artifacts.require("TestERC1404");
const vestingArtifact = artifacts.require("TokenVesting");
const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const proxyAdminArtifact = artifacts.require("ProxyAdmin");
const bigDivArtifact = artifacts.require("BigDiv");

contract("deploy script", accounts => {
  it("deploy", async () => {
    const abiJson = {};
    const bytecodeJson = {};
    const staticBytecodeJson = {
      bigDiv: bigDivArtifact.bytecode,
      testDai: testDaiArtifact.bytecode,
      testUsdc: testUsdcArtifact.bytecode,
      testErc1404: erc1404Artifact.bytecode
    };

    const network = await web3.eth.net.getNetworkType();
    const addresses =
      JSON.parse(fs.readFileSync("c-org-abi/addresses.json", "utf-8"))[
        network
      ] || {};

    const orgs = JSON.parse(fs.readFileSync("scripts/testOrgs.json", "utf-8"));

    for (let i = 0; i < orgs.length; i++) {
      const callOptions = orgs[i];
      let currencyToken;
      if (addresses[callOptions.currencyType]) {
        currencyToken = await testDaiArtifact.at(
          addresses[callOptions.currencyType]
        );
      } else {
        if (callOptions.currencyType === "dai") {
          currencyToken = await testDaiArtifact.new({ from: accounts[0] });
        } else if (callOptions.currencyType === "usdc") {
          currencyToken = await testUsdcArtifact.new({ from: accounts[0] });
        } else {
          throw new Error("Missing currency type");
        }

        console.log(
          `Deployed currency: ${
            currencyToken.address
          } (${await currencyToken.symbol()})`
        );
      }
      const contracts = await deployDat(
        accounts,
        Object.assign(
          {
            bigDivAddress: addresses.bigDiv,
            erc1404Address: addresses.erc1404,
            currency: currencyToken.address
          },
          callOptions
        )
      );

      abiJson.erc1820 = erc1820Artifact.abi;
      abiJson.erc1404 = contracts.erc1404.abi;
      abiJson.proxyAdmin = contracts.proxyAdmin.abi;
      abiJson.proxy = proxyArtifact.abi;
      bytecodeJson.proxyAdmin = proxyAdminArtifact.bytecode;
      bytecodeJson.proxy = proxyArtifact.bytecode;
      console.log(`ProxyAdmin: ${contracts.proxyAdmin.address}`);
      abiJson.fair = contracts.fair.abi;
      abiJson.dat = contracts.dat.abi;
      bytecodeJson.fair = fairArtifact.bytecode;
      bytecodeJson.dat = datArtifact.bytecode;
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
    fs.writeFile(
      `c-org-abi/static_bytecode.json`,
      JSON.stringify(staticBytecodeJson, null, 2),
      () => {}
    );
  });
});
