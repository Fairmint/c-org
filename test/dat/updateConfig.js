const { deployDat } = require("../datHelpers");
const { constants } = require("../helpers");
const { reverts } = require("truffle-assertions");

contract("dat / updateConfig", (accounts) => {
  let contracts;

  it("shouldFail with CONTROL_ONLY", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        await contracts.dat.revenueCommitmentBasisPoints(),
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: accounts[6] }
      ),
      "CONTROL_ONLY"
    );
  });

  it("can remove the whitelist", async () => {
    contracts = await deployDat(accounts);
    await contracts.dat.updateConfig(
      constants.ZERO_ADDRESS,
      await contracts.dat.beneficiary(),
      await contracts.dat.control(),
      await contracts.dat.feeCollector(),
      await contracts.dat.feeBasisPoints(),
      await contracts.dat.revenueCommitmentBasisPoints(),
      await contracts.dat.minInvestment(),
      await contracts.dat.minDuration(),
      { from: await contracts.dat.control() }
    );
  });

  it("shouldFail with INVALID_ADDRESS if control is missing", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        constants.ZERO_ADDRESS,
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        await contracts.dat.revenueCommitmentBasisPoints(),
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "INVALID_ADDRESS"
    );
  });

  it("shouldFail with INVALID_ADDRESS if feeCollector is missing", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        constants.ZERO_ADDRESS,
        await contracts.dat.feeBasisPoints(),
        await contracts.dat.revenueCommitmentBasisPoints(),
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "INVALID_ADDRESS"
    );
  });

  it("shouldFail with INVALID_COMMITMENT", async () => {
    contracts = await deployDat(accounts, {
      revenueCommitmentBasisPoints: 0,
    });
    contracts.dat.updateConfig(
      await contracts.dat.whitelist(),
      await contracts.dat.beneficiary(),
      await contracts.dat.control(),
      await contracts.dat.feeCollector(),
      await contracts.dat.feeBasisPoints(),
      "11",
      await contracts.dat.minInvestment(),
      await contracts.dat.minDuration(),
      { from: await contracts.dat.control() }
    );
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        "10",
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "COMMITMENT_MAY_NOT_BE_REDUCED"
    );
  });

  it("shouldFail with INVALID_COMMITMENT", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        "100000",
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "INVALID_COMMITMENT"
    );
  });

  it("shouldFail with INVALID_FEE", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        "100000",
        await contracts.dat.revenueCommitmentBasisPoints(),
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "INVALID_FEE"
    );
  });

  it("shouldFail with INVALID_MIN_INVESTMENT", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        await contracts.dat.revenueCommitmentBasisPoints(),
        "0",
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "INVALID_MIN_INVESTMENT"
    );
  });

  it("shouldFail with INVALID_ADDRESS when missing the beneficiary", async () => {
    contracts = await deployDat(accounts);
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        constants.ZERO_ADDRESS,
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        await contracts.dat.revenueCommitmentBasisPoints(),
        await contracts.dat.minInvestment(),
        await contracts.dat.minDuration(),
        { from: await contracts.dat.control() }
      ),
      "INVALID_ADDRESS"
    );
  });

  it("shouldFail with MIN_DURATION_MAY_NOT_BE_REDUCED", async () => {
    contracts = await deployDat(accounts);
    await contracts.dat.updateConfig(
      await contracts.dat.whitelist(),
      await contracts.dat.beneficiary(),
      await contracts.dat.control(),
      await contracts.dat.feeCollector(),
      await contracts.dat.feeBasisPoints(),
      await contracts.dat.revenueCommitmentBasisPoints(),
      await contracts.dat.minInvestment(),
      "100",
      { from: await contracts.dat.control() }
    );
    await reverts(
      contracts.dat.updateConfig(
        await contracts.dat.whitelist(),
        await contracts.dat.beneficiary(),
        await contracts.dat.control(),
        await contracts.dat.feeCollector(),
        await contracts.dat.feeBasisPoints(),
        await contracts.dat.revenueCommitmentBasisPoints(),
        await contracts.dat.minInvestment(),
        "99",
        { from: await contracts.dat.control() }
      ),
      "MIN_DURATION_MAY_NOT_BE_REDUCED"
    );
  });
});
