const BigNumber = require("bignumber.js");
const { deployDat } = require("../test/datHelpers");
const fs = require("fs");

const { tokens } = require("hardlydifficult-eth");
const proxyArtifact = artifacts.require("AdminUpgradeabilityProxy");
const whitelistArtifact = artifacts.require("Whitelist");
const vestingArtifact = artifacts.require("TokenVesting");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const proxyAdminArtifact = artifacts.require("ProxyAdmin");

contract("deploy script", (accounts) => {
  it("deploy", async () => {
    const abiJson = {};
    const bytecodeJson = {};

    let network = await web3.eth.net.getNetworkType();
    if (network === "main") {
      network = "mainnet";
    }

    const addresses =
      JSON.parse(fs.readFileSync("c-org-abi/addresses.json", "utf-8"))[
        network
      ] || {};

    const orgs = JSON.parse(fs.readFileSync("scripts/testOrgs.json", "utf-8"));

    for (let i = 0; i < orgs.length; i++) {
      const callOptions = orgs[i];
      let currencyToken;
      let currencyDecimals = 18;
      if (addresses[callOptions.currencyType]) {
        if (
          callOptions.currencyType &&
          callOptions.currencyType.toLowerCase().includes("dai")
        ) {
          currencyToken = await tokens.sai.getToken(
            web3,
            addresses[callOptions.currencyType]
          );
        } else if (
          callOptions.currencyType &&
          callOptions.currencyType.toLowerCase().includes("usdc")
        ) {
          currencyToken = await tokens.usdc.getToken(
            web3,
            addresses[callOptions.currencyType]
          );
        } else {
          throw new Error("Missing currency type");
        }
      } else {
        if (
          callOptions.currencyType === "dai" ||
          callOptions.currencyType === "testDAI"
        ) {
          currencyToken = await tokens.sai.deploy(web3, accounts[0]);
        } else if (
          callOptions.currencyType === "usdc" ||
          callOptions.currencyType === "testUSDC"
        ) {
          currencyToken = await tokens.usdc.deploy(
            web3,
            accounts[accounts.length - 1],
            accounts[0]
          );
        } else {
          throw new Error("Missing currency type");
        }

        console.log(
          `Deployed currency: ${
            currencyToken.address
          } (${await currencyToken.symbol()})`
        );
      }
      if (currencyToken) {
        currencyDecimals = parseInt(await currencyToken.decimals());
      }
      const contracts = await deployDat(
        accounts,
        Object.assign(
          {
            currency: currencyToken.address,
            minInvestment: new BigNumber("100")
              .shiftedBy(currencyDecimals)
              .toFixed(),
          },
          callOptions
        )
      );

      bytecodeJson.whitelist = whitelistArtifact.bytecode;
      abiJson.whitelist = contracts.whitelist.abi;
      abiJson.proxyAdmin = contracts.proxyAdmin.abi;
      abiJson.proxy = proxyArtifact.abi;
      bytecodeJson.proxyAdmin = proxyAdminArtifact.bytecode;
      bytecodeJson.proxy = proxyArtifact.bytecode;
      abiJson.dat = contracts.dat.abi;
      bytecodeJson.dat = datArtifact.bytecode;
      if (!abiJson.erc20) {
        abiJson.erc20 = currencyToken.abi;
      }

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
  });
});
