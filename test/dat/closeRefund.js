const { approveAll, deployDat } = require("../helpers");
const { reverts } = require("truffle-assertions");
const noFallbackProxyArtifact = artifacts.require("NoFallbackProxy");

contract("dat / closeRefund", (accounts) => {
  let contracts;
  let proxy;

  beforeEach(async () => {
    contracts = await deployDat(accounts);
    proxy = await noFallbackProxyArtifact.new();
    await approveAll(contracts, [proxy.address, ...accounts]);

    // Buy tokens for various accounts
    for (let i = 0; i < 9; i++) {
      await contracts.dat.buy(accounts[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: accounts[i],
      });
    }
  });

  it("sanity check", async () => {
    await contracts.dat.close({
      value: "1000000000000000000000000000",
      from: await contracts.dat.beneficiary(),
    });
  });

  it("shouldFail if the refund is rejected", async () => {
    // change beneficiary to the proxy
    await contracts.dat.updateConfig(
      await contracts.dat.whitelist(),
      proxy.address,
      await contracts.dat.control(),
      await contracts.dat.feeCollector(),
      await contracts.dat.feeBasisPoints(),
      await contracts.dat.revenueCommitmentBasisPoints(),
      await contracts.dat.minInvestment(),
      await contracts.dat.minDuration(),
      { from: await contracts.dat.control() }
    );

    const callData = web3.eth.abi.encodeFunctionCall(
      contracts.dat.abi.find((e) => e.name === "close"),
      []
    );
    await reverts(
      proxy.proxyCall(contracts.dat.address, callData, {
        value: "1000000000000000000000000000",
        from: await contracts.dat.control(),
      }),
      "INTERNAL_CONTRACT_CALL_FAILED"
    );
  });
});
