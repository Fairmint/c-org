const fairArtifact = artifacts.require("FAIR");
const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigDivArtifact = artifacts.require("BigDiv");
const tplArtifact = artifacts.require("TestTPLAttributeRegistry");
const authArtifact = artifacts.require("Authorization");
const proxyArtifact = artifacts.require("UpgradeableProxy");
const proxyAdminArtifact = artifacts.require("UpgradeableProxyAdmin");
const vestingArtifact = artifacts.require("Vesting");

const updateDatConfig = require("./updateDatConfig");

module.exports = async function deployDat(accounts, options) {
  const contracts = {};
  const callOptions = Object.assign(
    {
      initReserve: "42000000000000000000",
      currency: "0x0000000000000000000000000000000000000000",
      initGoal: "0",
      buySlopeNum: "1",
      buySlopeDen: "100000000000000000000",
      investmentReserveBasisPoints: "1000",
      revenueCommitementBasisPoints: "1000",
      control: accounts[1],
      beneficiary: accounts[0],
      feeCollector: accounts[2]
    },
    options
  );
  console.log(`Deploy DAT: ${JSON.stringify(callOptions, null, 2)}`);
  // ProxyAdmin
  contracts.proxyAdmin = await proxyAdminArtifact.new({
    from: callOptions.control
  });
  // FAIR
  const fairContract = await fairArtifact.new({
    from: callOptions.control
  });
  const fairProxy = await proxyArtifact.new(
    fairContract.address, // logic
    contracts.proxyAdmin.address, // admin
    [], // data
    {
      from: callOptions.control
    }
  );
  contracts.fair = await fairArtifact.at(fairProxy.address);
  // BigDiv
  contracts.bigDiv = await bigDivArtifact.new({
    from: callOptions.control
  });
  // DAT
  const datContract = await datArtifact.new({
    from: callOptions.control
  });
  const datProxy = await proxyArtifact.new(
    datContract.address, // logic
    contracts.proxyAdmin.address, // admin
    [], // data
    {
      from: callOptions.control
    }
  );
  contracts.dat = await datArtifact.at(datProxy.address);
  await contracts.dat.initialize(
    contracts.bigDiv.address,
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
  // Auth & TPL
  if (!callOptions.authorizationAddress) {
    const tpl = await tplArtifact.new({
      from: callOptions.control
    });
    const authContract = await authArtifact.new({
      from: callOptions.control
    });
    const authProxy = await proxyArtifact.new(
      authContract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control
      }
    );
    contracts.auth = await authArtifact.at(authProxy.address);
    await contracts.auth.initialize(contracts.fair.address, {
      from: callOptions.control
    });
    await contracts.auth.updateAuth(tpl.address, [42], [0, 0], [0, 0, 0], {
      from: callOptions.control
    });
    callOptions.authorizationAddress = contracts.auth.address;
  } else {
    contracts.auth = await authArtifact.at(callOptions.authorizationAddress);
  }
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
