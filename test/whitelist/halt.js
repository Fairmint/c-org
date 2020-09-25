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

contract("whitelist / halt", (accounts) => {
  let contracts;
  let ownerAccount;

  const operatorAccount = accounts[1];
  const haltedApproved = accounts[7];
  const resumedApproved = accounts[8];
  const haltedJurisdiction = 2;
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
    await contracts.whitelist.updateJurisdictionFlows([2, 4], [4, 2], [1, 1], {
      from: ownerAccount,
    });
    await contracts.whitelist.updateJurisdictionsForUserIds(
      [haltedApproved],
      [haltedJurisdiction],
      { from: operatorAccount }
    );
  });

  it("only owner cannot halt", async () => {
    const due = (await time.latest()).add(time.duration.weeks(1));
    await expectRevert(
      contracts.whitelist.halt([haltedJurisdiction], [due], {
        from: accounts[9],
      }),
      "Ownable: caller is not the owner"
    );
  });

  it("owner can addApprovedUserWallets", async () => {
    const due = (await time.latest()).add(time.duration.weeks(1));
    await contracts.whitelist.halt([haltedJurisdiction], [due], {
      from: ownerAccount,
    });
  });

  it("shouldFail to halt if expirationTimestamp is not future", async () => {
    const due = (await time.latest()).sub(time.duration.weeks(1));
    await expectRevert(
      contracts.whitelist.halt([haltedJurisdiction], [due], {
        from: ownerAccount,
      }),
      "HALT_DUE_SHOULD_BE_FUTURE"
    );
  });

  it("should emit Halt event", async () => {
    const due = (await time.latest()).add(time.duration.weeks(1));
    const receipt = await contracts.whitelist.halt(
      [haltedJurisdiction],
      [due],
      { from: ownerAccount }
    );
    expectEvent.inLogs(receipt.logs, "Halt", {
      _jurisdictionId: new BN(haltedJurisdiction),
      _until: due,
    });
  });

  describe("after halt", () => {
    beforeEach(async () => {
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
      await contracts.whitelist.halt([haltedJurisdiction], [due], {
        from: ownerAccount,
      });
    });

    it("should change jurisdictionHaltsUntil value", async () => {
      const until = await contracts.whitelist.jurisdictionHaltsUntil(
        haltedJurisdiction
      );
      assert.notEqual(new BN(until), new BN(0));
    });

    it("shouldFail to transfer when sender's jurisdiction is halted", async () => {
      await expectRevert(
        contracts.dat.transfer(resumedApproved, 100, { from: haltedApproved }),
        "FROM_JURISDICTION_HALTED"
      );
      const error_code = await contracts.whitelist.detectTransferRestriction(
        haltedApproved,
        resumedApproved,
        100
      );
      assert.equal(error_code, 4);
      const message = await contracts.whitelist.messageForTransferRestriction(
        error_code
      );
      assert.equal(message, "DENIED: JURISDICTION_HALT");
    });

    it("shouldFail to transfer when reciever's jurisdiction is halted", async () => {
      await expectRevert(
        contracts.dat.transfer(haltedApproved, 100, { from: resumedApproved }),
        "TO_JURISDICTION_HALTED"
      );
      const error_code = await contracts.whitelist.detectTransferRestriction(
        resumedApproved,
        haltedApproved,
        100
      );
      assert.equal(error_code, 4);
      const message = await contracts.whitelist.messageForTransferRestriction(
        error_code
      );
      assert.equal(message, "DENIED: JURISDICTION_HALT");
    });

    it("shouldFail to buy when buyer's jurisdiction is halted", async () => {
      const price = web3.utils.toWei("100", "ether");
      await expectRevert(
        contracts.dat.buy(haltedApproved, price, 1, {
          from: haltedApproved,
          value: price,
        }),
        "TO_JURISDICTION_HALTED"
      );
      const error_code = await contracts.whitelist.detectTransferRestriction(
        constants.ZERO_ADDRESS,
        haltedApproved,
        100
      );
      assert.equal(error_code, 4);
      const message = await contracts.whitelist.messageForTransferRestriction(
        error_code
      );
      assert.equal(message, "DENIED: JURISDICTION_HALT");
    });

    it("shouldFail to sell when seller's jurisdiction is halted", async () => {
      await expectRevert(
        contracts.dat.sell(haltedApproved, 100, 1, { from: haltedApproved }),
        "FROM_JURISDICTION_HALTED"
      );
      const error_code = await contracts.whitelist.detectTransferRestriction(
        haltedApproved,
        constants.ZERO_ADDRESS,
        100
      );
      assert.equal(error_code, 4);
      const message = await contracts.whitelist.messageForTransferRestriction(
        error_code
      );
      assert.equal(message, "DENIED: JURISDICTION_HALT");
    });

    describe("when halt ended", () => {
      beforeEach(async () => {
        await time.increase(time.duration.weeks(2));
      });
      it("should success to transfer when sender's jurisdiction halt ended", async () => {
        await contracts.dat.transfer(resumedApproved, 100, {
          from: haltedApproved,
        });
      });

      it("should success to transfer when reciever's jurisdiction halt ended", async () => {
        await contracts.dat.transfer(haltedApproved, 100, {
          from: resumedApproved,
        });
      });

      it("should success to buy when buyer's jurisdiction halt ended", async () => {
        const price = web3.utils.toWei("100", "ether");
        await contracts.dat.buy(haltedApproved, price, 1, {
          from: haltedApproved,
          value: price,
        });
      });

      it("should success to sell when seller's jurisdiction halt ended", async () => {
        await contracts.dat.sell(haltedApproved, 100, 1, {
          from: haltedApproved,
        });
      });
    });
  });
});
