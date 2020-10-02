const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

const { assert } = require("chai");

contract("whitelist / deactivateWallet", (accounts) => {
  let contracts;

  const operatorAccount = accounts[1];
  beforeEach(async () => {
    contracts = await deployDat(accounts);
    await contracts.whitelist.approveNewUsers(
      [accounts[5], accounts[7]],
      [4, 4],
      {
        from: operatorAccount,
      }
    );
    await contracts.whitelist.addApprovedUserWallets(
      [accounts[5], accounts[5], accounts[7]],
      [accounts[4], accounts[6], accounts[8]],
      {
        from: operatorAccount,
      }
    );
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(accounts[4], price, 1, {
      from: accounts[4],
      value: price,
    });
    await contracts.dat.buy(accounts[6], price, 1, {
      from: accounts[6],
      value: price,
    });
  });

  it("shouldFail if wallet has balance", async () => {
    await expectRevert(
      contracts.whitelist.deactivateWallet(accounts[4], {
        from: operatorAccount,
      }),
      "ATTEMPT_TO_DEACTIVATE_WALLET_WITH_BALANCE"
    );
  });

  it("shouldFail if wallet does not have approvedUserId", async () => {
    await expectRevert(
      contracts.whitelist.deactivateWallet(accounts[9], {
        from: operatorAccount,
      }),
      "USER_UNKNOWN"
    );
  });

  it("shouldFail when wallet is already deactivated", async () => {
    await expectRevert(
      contracts.whitelist.deactivateWallet(accounts[8], {
        from: operatorAccount,
      }),
      "ALREADY_DEACTIVATED_WALLET"
    );
  });

  it("shouldFail if wallet has balance", async () => {
    await expectRevert(
      contracts.whitelist.deactivateWallets([accounts[4]], {
        from: operatorAccount,
      }),
      "ATTEMPT_TO_DEACTIVATE_WALLET_WITH_BALANCE"
    );
  });

  it("should automatically deactivate when selling whole balance", async () => {
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), true);
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      2
    );
    const amount = await contracts.dat.balanceOf(accounts[4]);
    await contracts.dat.sell(accounts[4], amount, 1, {
      from: accounts[4],
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      1
    );
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
  });

  it("should automatically deactivate from wallet when sending all balance", async () => {
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), true);
    assert.equal(await contracts.whitelist.walletActivated(accounts[6]), true);
    const amount = await contracts.dat.balanceOf(accounts[4]);
    await contracts.dat.transfer(accounts[6], amount, {
      from: accounts[4],
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    assert.equal(await contracts.whitelist.walletActivated(accounts[6]), true);
  });

  it("should decrease userActiveWalletCount", async () => {
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[6]),
      accounts[5]
    );
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      2
    );
    const amount = await contracts.dat.balanceOf(accounts[4]);
    await contracts.dat.transfer(accounts[6], amount, {
      from: accounts[4],
    });
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[6]),
      accounts[5]
    );
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      1
    );
  });

  it("should delist user if user has no more active wallet", async () => {
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[6]),
      accounts[5]
    );
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
    const amount = await contracts.dat.balanceOf(accounts[4]);
    await contracts.dat.transfer(accounts[6], amount, {
      from: accounts[4],
    });
    const amount2 = await contracts.dat.balanceOf(accounts[6]);
    await contracts.dat.sell(accounts[6], amount2, 1, {
      from: accounts[6],
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    assert.equal(await contracts.whitelist.walletActivated(accounts[6]), false);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      0
    );
    assert.equal(
      await contracts.whitelist.investorEnlisted(accounts[5]),
      false
    );

    await contracts.whitelist.activateWallets([accounts[4], accounts[6]], {
      from: operatorAccount,
    });
    await contracts.whitelist.deactivateWallets([accounts[4], accounts[6]], {
      from: operatorAccount,
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    assert.equal(await contracts.whitelist.walletActivated(accounts[6]), false);
  });
});
