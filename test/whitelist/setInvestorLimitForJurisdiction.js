const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");
const {
  constants,
  BN,
  expectRevert,
  expectEvent,
  time,
} = require("@openzeppelin/test-helpers");

const { assert } = require("chai");

contract("whitelist / setInvestorLimitForJurisdiction", (accounts) => {
  let contracts;
  let ownerAccount;

  const operatorAccount = accounts[1];
  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await contracts.whitelist.approveNewUsers([accounts[5],accounts[7]], [4,4], {
      from: operatorAccount,
    });
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
    await contracts.dat.buy(accounts[8], price, 1, {
      from: accounts[8],
      value: price,
    });
  });

  it("shouldFail when msg.sender is not owner", async () => {
    await expectRevert(contracts.whitelist.setInvestorLimitForJurisdiction(4,10,{from:accounts[4]}),"Ownable: caller is not the owner");
  });

  it("shouldFail if limit is less than currentInvestors", async () => {
    await expectRevert(contracts.whitelist.setInvestorLimitForJurisdiction(4,1,{from:ownerAccount}),"LIMIT_SHOULD_BE_LARGER_THAN_CURRENT_INVESTORS");
  });

  it("should update maxInvestors", async () => {
    await contracts.whitelist.setInvestorLimitForJurisdiction(4,10,{from:ownerAccount})
    assert.equal(await contracts.whitelist.maxInvestorsByJurisdiction(4), 10);
  });
});
