const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigDivArtifact = artifacts.require("BigDiv");
const erc1404Artifact = artifacts.require("ERC1404");
const proxyArtifact = artifacts.require("AdminUpgradeabilityProxy");
const proxyAdminArtifact = artifacts.require("ProxyAdmin");
const vestingArtifact = artifacts.require("TokenVesting");

const updateDatConfig = require("./updateDatConfig");

module.exports = async function deployDat(accounts, options, useProxy = true) {
  const contracts = {};
  const callOptions = Object.assign(
    {
      initReserve: "42000000000000000000",
      currency: web3.utils.padLeft(0, 40),
      initGoal: "0",
      buySlopeNum: "1",
      buySlopeDen: "100000000000000000000",
      investmentReserveBasisPoints: "1000",
      revenueCommitementBasisPoints: "1000",
      control: accounts.length > 2 ? accounts[1] : accounts[0],
      beneficiary: accounts[0],
      feeCollector: accounts.length > 2 ? accounts[2] : accounts[0]
    },
    options
  );
  // console.log(`Deploy DAT: ${JSON.stringify(callOptions, null, 2)}`);

  if (useProxy) {
    // ProxyAdmin
    contracts.proxyAdmin = await proxyAdminArtifact.new({
      from: callOptions.control
    });
  }

  // BigDiv
  if (callOptions.bigDivAddress) {
    contracts.bigDiv = await bigDivArtifact.at(callOptions.bigDivAddress);
  } else {
    contracts.bigDiv = await bigDivArtifact.new({
      from: callOptions.control
    });
    callOptions.bigDivAddress = contracts.bigDiv.address;
    // console.log(`Deployed bigDiv: ${contracts.bigDiv.address}`);
  }
  // DAT
  const datContract = await datArtifact.new({
    from: callOptions.control
  });
  if (useProxy) {
    const datProxy = await proxyArtifact.new(
      datContract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control
      }
    );
    contracts.dat = await datArtifact.at(datProxy.address);
  } else {
    contracts.dat = datContract;
  }
  await contracts.dat.initialize(
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.buySlopeNum,
    callOptions.buySlopeDen,
    callOptions.investmentReserveBasisPoints,
    callOptions.revenueCommitementBasisPoints,
    { from: callOptions.control }
  );
  // ERC1404
  const erc1404Contract = await erc1404Artifact.new({
    from: callOptions.control
  });
  if (useProxy) {
    const erc1404Proxy = await proxyArtifact.new(
      erc1404Contract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control
      }
    );

    contracts.erc1404 = await erc1404Artifact.at(erc1404Proxy.address);
  } else {
    contracts.erc1404 = erc1404Contract;
  }
  await contracts.erc1404.initialize({ from: callOptions.control });
  callOptions.erc1404Address = contracts.erc1404.address;
  // console.log(`Deployed erc1404: ${contracts.erc1404.address}`);
  let promises = [];

  promises.push(
    contracts.erc1404.approve(callOptions.control, true, {
      from: callOptions.control
    })
  );
  promises.push(
    contracts.erc1404.approve(callOptions.beneficiary, true, {
      from: callOptions.control
    })
  );
  promises.push(
    contracts.erc1404.approve(callOptions.feeCollector, true, {
      from: callOptions.control
    })
  );
  promises.push(
    contracts.erc1404.approve(contracts.dat.address, true, {
      from: callOptions.control
    })
  );

  // Update DAT (with new AUTH and other callOptions)
  promises.push(updateDatConfig(contracts, callOptions));
  await Promise.all(promises);

  // Move the initReserve to vesting contracts
  if (callOptions.vesting) {
    contracts.vesting = [];
    for (let i = 0; i < callOptions.vesting.length; i++) {
      const vestingBeneficiary = callOptions.vesting[i].address;
      const contract = await vestingArtifact.new(
        vestingBeneficiary, // beneficiary
        Math.round(Date.now() / 1000) + 100, // startTime is seconds
        120, // cliffDuration in seconds
        200, // duration in seconds
        false, // non-revocable
        {
          from: callOptions.control
        }
      );
      contracts.vesting.push(contract);

      await contracts.erc1404.approve(contracts.vesting[i].address, true, {
        from: callOptions.control
      });
      await contracts.dat.transfer(
        contract.address,
        callOptions.vesting[i].value,
        {
          from: callOptions.beneficiary
        }
      );
    }
  }
  return contracts;
};
