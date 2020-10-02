const { deployDat } = require("../datHelpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

const { assert } = require("chai");

contract("whitelist / activateWallet", (accounts) => {
  let contracts;
  let ownerAccount;

  const operatorAccount = accounts[1];
  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
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
  });

  it("shouldFail when msg.sender is not callingContract nor owner", async () => {
    await expectRevert(
      contracts.whitelist.activateWallet(accounts[4], { from: accounts[4] }),
      "CALL_VIA_CONTRACT_OR_OPERATOR_ONLY"
    );
  });

  it("shouldFail when wallet does not have approvedUserId", async () => {
    await expectRevert(
      contracts.whitelist.activateWallets([accounts[9]], {
        from: operatorAccount,
      }),
      "USER_UNKNOWN"
    );
  });

  it("shouldFail when wallet is already activated", async () => {
    await contracts.whitelist.activateWallets([accounts[4]], {
      from: operatorAccount,
    });
    await expectRevert(
      contracts.whitelist.activateWallet(accounts[4], {
        from: operatorAccount,
      }),
      "ALREADY_ACTIVATED_WALLET"
    );
  });

  it("should automatically activate from, to wallets when transfer triggered", async () => {
    //for upgrade from previous contract
    //test need to be done on upgrade.js to check if activation is done for wallet with balance
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[6]),
      accounts[5]
    );
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(accounts[6], price, 1, {
      from: accounts[6],
      value: price,
    });
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      1
    );
    const amount = await contracts.dat.balanceOf(accounts[6]);
    await contracts.dat.transfer(accounts[4], amount.subn(1), {
      from: accounts[6],
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), true);
  });

  it("should automatically activate to wallet when buy triggered", async () => {
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(accounts[4], price, 1, {
      from: accounts[4],
      value: price,
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), true);
  });

  it.skip("should automatically activate from wallet when sell triggered", async () => {
    //for upgrade from previous contract
    //test need to be done on upgrade.js
  });

  it("should increase userActiveWalletCount", async () => {
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), false);
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[4]),
      accounts[5]
    );
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[6]),
      accounts[5]
    );
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(accounts[6], price, 1, {
      from: accounts[6],
      value: price,
    });
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[5]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      1
    );
    const amount = await contracts.dat.balanceOf(accounts[6]);
    await contracts.dat.transfer(accounts[4], amount.subn(1), {
      from: accounts[6],
    });
    assert.equal(await contracts.whitelist.walletActivated(accounts[4]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[5]),
      2
    );
  });

  it("should enlist user if user is delisted when wallet == user", async () => {
    assert.equal(
      await contracts.whitelist.investorEnlisted(accounts[7]),
      false
    );
    assert.equal(await contracts.whitelist.walletActivated(accounts[7]), false);
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[7]),
      accounts[7]
    );
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(accounts[7], price, 1, {
      from: accounts[7],
      value: price,
    });
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[7]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[7]),
      1
    );
    assert.equal(await contracts.whitelist.walletActivated(accounts[7]), true);
  });

  it("should enlist user if user is delisted when wallet != user", async () => {
    assert.equal(
      await contracts.whitelist.investorEnlisted(accounts[7]),
      false
    );
    assert.equal(await contracts.whitelist.walletActivated(accounts[7]), false);
    assert.equal(
      await contracts.whitelist.authorizedWalletToUserId(accounts[8]),
      accounts[7]
    );
    const price = web3.utils.toWei("100", "ether");
    await contracts.dat.buy(accounts[8], price, 1, {
      from: accounts[8],
      value: price,
    });
    assert.equal(await contracts.whitelist.investorEnlisted(accounts[7]), true);
    assert.equal(
      await contracts.whitelist.userActiveWalletCount(accounts[7]),
      1
    );
    assert.equal(await contracts.whitelist.walletActivated(accounts[8]), true);
  });

  it("should fail if currentUser exceeds total limit", async () => {
    const curInvestors = await contracts.whitelist.currentInvestors();
    await contracts.whitelist.setInvestorLimit(curInvestors, {
      from: ownerAccount,
    });
    const price = web3.utils.toWei("100", "ether");
    await expectRevert(
      contracts.dat.buy(accounts[7], price, 1, {
        from: accounts[7],
        value: price,
      }),
      "EXCEEDING_MAX_INVESTORS"
    );
  });

  it("should fail if currentUser of jurisdiction exceeds jurisdiction limit", async () => {
    const curInvestors = await contracts.whitelist.currentInvestorsByJurisdiction(
      4
    );
    await contracts.whitelist.setInvestorLimitForJurisdiction(
      [4],
      [curInvestors],
      { from: ownerAccount }
    );
    const price = web3.utils.toWei("100", "ether");
    await expectRevert(
      contracts.dat.buy(accounts[7], price, 1, {
        from: accounts[7],
        value: price,
      }),
      "EXCEEDING_JURISDICTION_MAX_INVESTORS"
    );
  });
});
