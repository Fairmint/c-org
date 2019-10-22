const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
const bigMathArtifact = artifacts.require("BigMath");
const whitelistArtifact = artifacts.require("Whitelist");
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
      revenueCommitmentBasisPoints: "1000",
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

  // BigMath
  if (callOptions.bigMathAddress) {
    contracts.bigMath = await bigMathArtifact.at(callOptions.bigMathAddress);
  } else {
    contracts.bigMath = await bigMathArtifact.new({
      from: callOptions.control
    });
    callOptions.bigMathAddress = contracts.bigMath.address;
    console.log(`Deployed bigMath: ${contracts.bigMath.address}`);
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
  console.log(`Deployed DAT: ${contracts.dat.address}`);
  await contracts.dat.initialize(
    callOptions.initReserve,
    callOptions.currency,
    callOptions.initGoal,
    callOptions.buySlopeNum,
    callOptions.buySlopeDen,
    callOptions.investmentReserveBasisPoints,
    { from: callOptions.control }
  );
  // Whitelist
  const whitelistContract = await whitelistArtifact.new({
    from: callOptions.control
  });
  if (useProxy) {
    const whitelistProxy = await proxyArtifact.new(
      whitelistContract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control
      }
    );

    contracts.whitelist = await whitelistArtifact.at(whitelistProxy.address);
  } else {
    contracts.whitelist = whitelistContract;
  }
  await contracts.whitelist.initialize(contracts.dat.address, {
    from: callOptions.control
  });
  callOptions.whitelistAddress = contracts.whitelist.address;
  // console.log(`Deployed whitelist: ${contracts.whitelist.address}`);
  let promises = [];

  promises.push(
    contracts.whitelist.approve(callOptions.control, true, {
      from: callOptions.control
    })
  );
  promises.push(
    contracts.whitelist.approve(callOptions.beneficiary, true, {
      from: callOptions.control
    })
  );
  promises.push(
    contracts.whitelist.approve(callOptions.feeCollector, true, {
      from: callOptions.control
    })
  );
  promises.push(
    contracts.whitelist.approve(contracts.dat.address, true, {
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

      await contracts.whitelist.approve(contracts.vesting[i].address, true, {
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
