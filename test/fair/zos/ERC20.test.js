const { approveAll, deployDat } = require("../../helpers");

// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
} = require("./ERC20.behavior");

contract("ERC20", function (accounts) {
  const [_, initialHolder, recipient, anotherAccount] = accounts;
  const initialSupply = new BN(100);

  beforeEach(async function () {
    const contracts = await deployDat(accounts, {
      initGoal: 0,
      initReserve: initialSupply.toString(),
      beneficiary: initialHolder,
    });
    await approveAll(contracts, accounts);
    this.token = contracts.dat;
  });

  shouldBehaveLikeERC20(
    "ERC20",
    initialSupply,
    initialHolder,
    recipient,
    anotherAccount
  );

  describe("decrease allowance", function () {
    describe("when the spender is not the zero address", function () {
      const spender = recipient;

      function shouldDecreaseApproval(amount) {
        describe("when there was no approved amount before", function () {
          it("reverts", async function () {
            await expectRevert(
              this.token.decreaseAllowance(spender, amount, {
                from: initialHolder,
              }),
              "ERC20: decreased allowance below zero"
            );
          });
        });

        describe("when the spender had an approved amount", function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await this.token.approve(
              spender,
              approvedAmount,
              { from: initialHolder }
            ));
          });

          it("emits an approval event", async function () {
            const { logs } = await this.token.decreaseAllowance(
              spender,
              approvedAmount,
              { from: initialHolder }
            );

            expectEvent.inLogs(logs, "Approval", {
              owner: initialHolder,
              spender: spender,
              value: new BN(0),
            });
          });

          it("decreases the spender allowance subtracting the requested amount", async function () {
            await this.token.decreaseAllowance(
              spender,
              approvedAmount.subn(1),
              { from: initialHolder }
            );

            expect(
              await this.token.allowance(initialHolder, spender)
            ).to.be.bignumber.equal("1");
          });

          it("sets the allowance to zero when all allowance is removed", async function () {
            await this.token.decreaseAllowance(spender, approvedAmount, {
              from: initialHolder,
            });
            expect(
              await this.token.allowance(initialHolder, spender)
            ).to.be.bignumber.equal("0");
          });

          it("reverts when more than the full allowance is removed", async function () {
            await expectRevert(
              this.token.decreaseAllowance(spender, approvedAmount.addn(1), {
                from: initialHolder,
              }),
              "ERC20: decreased allowance below zero"
            );
          });
        });
      }

      describe("when the sender has enough balance", function () {
        const amount = initialSupply;

        shouldDecreaseApproval(amount);
      });

      describe("when the sender does not have enough balance", function () {
        const amount = initialSupply.addn(1);

        shouldDecreaseApproval(amount);
      });
    });

    describe("when the spender is the zero address", function () {
      const amount = initialSupply;
      const spender = ZERO_ADDRESS;

      it("reverts", async function () {
        await expectRevert(
          this.token.decreaseAllowance(spender, amount, {
            from: initialHolder,
          }),
          "ERC20: decreased allowance below zero"
        );
      });
    });
  });

  describe("increase allowance", function () {
    const amount = initialSupply;

    describe("when the spender is not the zero address", function () {
      const spender = recipient;

      describe("when the sender has enough balance", function () {
        it("emits an approval event", async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, {
            from: initialHolder,
          });

          expectEvent.inLogs(logs, "Approval", {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
        });

        describe("when there was no approved amount before", function () {
          it("approves the requested amount", async function () {
            await this.token.increaseAllowance(spender, amount, {
              from: initialHolder,
            });

            expect(
              await this.token.allowance(initialHolder, spender)
            ).to.be.bignumber.equal(amount);
          });
        });

        describe("when the spender had an approved amount", function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), {
              from: initialHolder,
            });
          });

          it("increases the spender allowance adding the requested amount", async function () {
            await this.token.increaseAllowance(spender, amount, {
              from: initialHolder,
            });

            expect(
              await this.token.allowance(initialHolder, spender)
            ).to.be.bignumber.equal(amount.addn(1));
          });
        });
      });

      describe("when the sender does not have enough balance", function () {
        const amount = initialSupply.addn(1);

        it("emits an approval event", async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, {
            from: initialHolder,
          });

          expectEvent.inLogs(logs, "Approval", {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
        });

        describe("when there was no approved amount before", function () {
          it("approves the requested amount", async function () {
            await this.token.increaseAllowance(spender, amount, {
              from: initialHolder,
            });

            expect(
              await this.token.allowance(initialHolder, spender)
            ).to.be.bignumber.equal(amount);
          });
        });

        describe("when the spender had an approved amount", function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), {
              from: initialHolder,
            });
          });

          it("increases the spender allowance adding the requested amount", async function () {
            await this.token.increaseAllowance(spender, amount, {
              from: initialHolder,
            });

            expect(
              await this.token.allowance(initialHolder, spender)
            ).to.be.bignumber.equal(amount.addn(1));
          });
        });
      });
    });

    describe("when the spender is the zero address", function () {
      const spender = ZERO_ADDRESS;

      it("reverts", async function () {
        await expectRevert(
          this.token.increaseAllowance(spender, amount, {
            from: initialHolder,
          }),
          "ERC20: approve to the zero address"
        );
      });
    });
  });

  describe("_mint", function () {
    const amount = new BN("289827534923788771474");
    it("rejects a null account", async function () {
      await expectRevert(
        this.token.buy(ZERO_ADDRESS, "420000000000000000000", 1, {
          value: "420000000000000000000",
          from: accounts[1],
        }),
        "INVALID_ADDRESS"
      );
    });

    describe("for a non zero account", function () {
      beforeEach("minting", async function () {
        const { logs } = await this.token.buy(
          recipient,
          "420000000000000000000",
          1,
          {
            value: "420000000000000000000",
            from: accounts[1],
          }
        );
        this.logs = logs;
      });

      it("increments totalSupply", async function () {
        const expectedSupply = initialSupply.add(amount);
        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          expectedSupply
        );
      });

      it("increments recipient balance", async function () {
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(
          amount
        );
      });

      it("emits Transfer event", async function () {
        const event = expectEvent.inLogs(this.logs, "Transfer", {
          from: ZERO_ADDRESS,
          to: recipient,
        });

        expect(event.args.value).to.be.bignumber.equal(amount);
      });
    });
  });

  describe("_burn", function () {
    describe("for a non zero account", function () {
      it("rejects burning more than balance", async function () {
        await expectRevert(
          this.token.burn(initialSupply.addn(1), { from: initialHolder }),
          "ERC20: burn amount exceeds balance"
        );
      });

      const describeBurn = function (description, amount) {
        describe(description, function () {
          beforeEach("burning", async function () {
            const { logs } = await this.token.burn(amount, {
              from: initialHolder,
            });
            this.logs = logs;
          });

          it("decrements totalSupply", async function () {
            const expectedSupply = initialSupply.sub(amount);
            expect(await this.token.totalSupply()).to.be.bignumber.equal(
              expectedSupply
            );
          });

          it("decrements initialHolder balance", async function () {
            const expectedBalance = initialSupply.sub(amount);
            expect(
              await this.token.balanceOf(initialHolder)
            ).to.be.bignumber.equal(expectedBalance);
          });

          it("emits Transfer event", async function () {
            const event = expectEvent.inLogs(this.logs, "Transfer", {
              from: initialHolder,
              to: ZERO_ADDRESS,
            });

            expect(event.args.value).to.be.bignumber.equal(amount);
          });
        });
      };

      describeBurn("for entire balance", initialSupply);
      describeBurn("for less amount than balance", initialSupply.subn(1));
    });
  });

  describe("_transfer", function () {
    shouldBehaveLikeERC20Transfer(
      "ERC20",
      initialHolder,
      recipient,
      initialSupply,
      function (from, to, amount) {
        return this.token.transfer(to, amount, { from });
      }
    );
  });

  describe("_approve", function () {
    shouldBehaveLikeERC20Approve(
      "ERC20",
      initialHolder,
      recipient,
      initialSupply,
      function (owner, spender, amount) {
        return this.token.approve(spender, amount, { from: owner });
      }
    );
  });
});
