const datArtifact = artifacts.require("DecentralizedAutonomousTrust");
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
      feeCollector: accounts.length > 2 ? accounts[2] : accounts[0],
      name: "Test org",
      symbol: "TFO"
    },
    options
  );
  // console.log(`Deploy DAT: ${JSON.stringify(callOptions, null, 2)}`);

  if (useProxy) {
    // ProxyAdmin
    contracts.proxyAdmin = await proxyAdminArtifact.new({
      from: callOptions.control
    });
    console.log(`ProxyAdmin deployed ${contracts.proxyAdmin.address}`);
  }

  // DAT
  const datContract = await datArtifact.new({
    from: callOptions.control
  });
  console.log(`DAT template deployed ${datContract.address}`);

  if (useProxy) {
    const datProxy = await proxyArtifact.new(
      datContract.address, // logic
      contracts.proxyAdmin.address, // admin
      [], // data
      {
        from: callOptions.control
      }
    );
    console.log(`DAT proxy deployed ${datProxy.address}`);

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
    callOptions.name,
    callOptions.symbol,
    { from: callOptions.control }
  );
  let promises = [];
  // Whitelist
  if (callOptions.whitelistAddress === undefined) {
    const whitelistContract = await whitelistArtifact.new({
      from: callOptions.control
    });
    console.log(`Whitelist template deployed ${whitelistContract.address}`);

    if (useProxy) {
      const whitelistProxy = await proxyArtifact.new(
        whitelistContract.address, // logic
        contracts.proxyAdmin.address, // admin
        [], // data
        {
          from: callOptions.control
        }
      );
      console.log(`Whitelist proxy deployed ${whitelistProxy.address}`);

      contracts.whitelist = await whitelistArtifact.at(whitelistProxy.address);
    } else {
      contracts.whitelist = whitelistContract;
    }
    await contracts.whitelist.initialize(contracts.dat.address, {
      from: callOptions.control
    });
    await contracts.whitelist.updateJurisdictionFlows(
      [1, 4, 4],
      [4, 1, 4],
      [true, true, true],
      {
        from: callOptions.control
      }
    );
    callOptions.whitelistAddress = contracts.whitelist.address;
    // console.log(`Deployed whitelist: ${contracts.whitelist.address}`);

    promises.push(
      contracts.whitelist.approveNewUsers([callOptions.control], [4], {
        from: callOptions.control
      })
    );
    if (callOptions.control != callOptions.beneficiary) {
      promises.push(
        contracts.whitelist.approveNewUsers([callOptions.beneficiary], [4], {
          from: callOptions.control
        })
      );
    }
    if (
      callOptions.feeCollector != callOptions.control &&
      callOptions.feeCollector != callOptions.beneficiary
    ) {
      promises.push(
        contracts.whitelist.approveNewUsers([callOptions.feeCollector], [4], {
          from: callOptions.control
        })
      );
    }
    promises.push(
      contracts.whitelist.approveNewUsers([web3.utils.padLeft(0, 40)], [1], {
        from: callOptions.control
      })
    );
  }

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
        Math.round(Date.now() / 1000) + 100, // startDate is seconds
        120, // cliffDuration in seconds
        200, // duration in seconds
        false, // non-revocable
        {
          from: callOptions.control
        }
      );
      console.log(`Vesting contract deployed ${contract.address}`);

      contracts.vesting.push(contract);

      if (contracts.whitelist) {
        await contracts.whitelist.approveNewUsers(
          [contracts.vesting[i].address],
          [4],
          {
            from: callOptions.control
          }
        );
        await contracts.whitelist.addApprovedUserWallets(
          [callOptions.beneficiary],
          [contracts.vesting[i].address]
        );
      }
      await contracts.dat.transfer(
        contract.address,
        callOptions.vesting[i].value,
        {
          from: callOptions.beneficiary
        }
      );
    }
  }

  console.log(`===============================`);
  return contracts;
};
