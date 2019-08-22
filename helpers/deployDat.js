const fairArtifact = artifacts.require("FAIR");
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

  // FAIR
  const fairContract = await fairArtifact.new({
    from: callOptions.control
  });
  if (useProxy) {
    const fairProxy = await proxyArtifact.new(
      fairContract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control
      }
    );

    contracts.fair = await fairArtifact.at(fairProxy.address);
  } else {
    contracts.fair = fairContract;
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
    callOptions.bigDivAddress,
    contracts.fair.address,
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
  contracts.erc1404 = await erc1404Artifact.new({
    from: callOptions.control
  });
  await contracts.erc1404.initialize({ from: callOptions.control });
  callOptions.erc1404Address = contracts.erc1404.address;
  // console.log(`Deployed erc1404: ${contracts.erc1404.address}`);
  await contracts.erc1404.approve(callOptions.control, true, {
    from: callOptions.control
  });
  await contracts.erc1404.approve(callOptions.beneficiary, true, {
    from: callOptions.control
  });
  await contracts.erc1404.approve(callOptions.feeCollector, true, {
    from: callOptions.control
  });

  // Update DAT (with new AUTH and other callOptions)
  await updateDatConfig(contracts, callOptions);
  // Move the initReserve to vesting contracts
  if (callOptions.vesting) {
    contracts.vesting = [];
    for (let i = 0; i < callOptions.vesting.length; i++) {
      const vestingBeneficiary = callOptions.vesting[i].address; // TODO
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
      await contracts.fair.transfer(
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
