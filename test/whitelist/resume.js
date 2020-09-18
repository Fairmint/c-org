const { deployDat } = require("../datHelpers");
const { approveAll } = require("../helpers");
const { BN, expectRevert, expectEvent, time } = require("@openzeppelin/test-helpers");

const { BigNumber } = require("bignumber.js");
const { assert } = require("chai");

contract("whitelist / resume", (accounts) => {
  let contracts;
  let ownerAccount;

  const operatorAccount = accounts[1];
  const haltedApproved = accounts[7]
  const resumedApproved = accounts[8]
  const resumeApproved_2 = accounts[9];
  const haltedJurisdiction = 2;
  const resumedJurisdiction = 4;
  beforeEach(async () => {
    contracts = await deployDat(accounts);
    ownerAccount = await contracts.whitelist.owner();
    await approveAll(contracts, accounts);
    await contracts.whitelist.updateJurisdictionFlows(
        [1, 2, 2],
        [2, 1, 2],
        [1, 1, 1],
        {
          from: ownerAccount,
        }
      );
    await contracts.whitelist.updateJurisdictionFlows(
        [2, 4],
        [4, 2],
        [1, 1],
        {
          from: ownerAccount,
        }
      )
      await contracts.whitelist.updateJurisdictionsForUserIds([haltedApproved], [haltedJurisdiction],{from:operatorAccount});
      const price = web3.utils.toWei("100", "ether");
      await contracts.dat.buy(haltedApproved, price, 1, {
        from: haltedApproved,
        value: price,
      });
      await contracts.dat.buy(resumedApproved, price, 1, {
        from: resumedApproved,
        value: price,
      });

      const due = (await time.latest()).add(time.duration.weeks(1));
      await contracts.whitelist.halt([haltedJurisdiction], [due], {from:ownerAccount});
  });

  it("non-operators cannot halt", async () => {
    await expectRevert(contracts.whitelist.resume([haltedJurisdiction], {from:accounts[9]}), "Ownable: caller is not the owner");
  });

  it("operators can addApprovedUserWallets", async () => {
    await contracts.whitelist.resume([haltedJurisdiction], {from:ownerAccount});
  });

  it("shouldFail if the jurisdiction is not halted", async () =>{
    await expectRevert(contracts.whitelist.resume([resumedJurisdiction], {from:ownerAccount}), "ATTEMPT_TO_RESUME_NONE_HALTED_JURISDICATION");
  });

  it("should emit Resume event", async () => {
    const receipt = await contracts.whitelist.resume([haltedJurisdiction], {from:ownerAccount});
    expectEvent.inLogs(receipt.logs, "Resume", {
      _jurisdictionId: new BN(haltedJurisdiction)
    });
  });

  describe("after resume", () => {
    beforeEach(async () => {
      await contracts.whitelist.resume([haltedJurisdiction], {from:ownerAccount});
    });

    it("should change jurisdictionHaltsUntil value to zero", async () => {
      const until = await contracts.whitelist.jurisdictionHaltsUntil(haltedJurisdiction);
      assert.equal(
        new BN(until).toString(),
        new BN(0).toString()
      );
    });

    it("should be able to transfer when sender's jurisdiction is resumed", async () => {
      await contracts.dat.transfer(resumedApproved, 100, {from:haltedApproved});
    });
    
    it("should be able to transfer when reciever's jurisdiction is resumed", async () => {
      await contracts.dat.transfer(haltedApproved, 100, {from:resumedApproved});
    });
    
    it("should be able to buy when buyer's jurisdiction is resumed", async () => {
      const price = web3.utils.toWei("100", "ether");
      await contracts.dat.buy(haltedApproved, price, 1, {from:haltedApproved, value:price});
    });
    
    it("should be able to sell when seller's jurisdiction is resumed", async () => {
      await contracts.dat.sell(haltedApproved, 100, 1, {from:haltedApproved});
    });
  });
});

