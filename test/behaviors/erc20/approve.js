// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { BigNumber } = require("bignumber.js");
const { assert } = require("chai");

module.exports = function (tokenOwner, operator) {
  describe("Behavior / ERC20 / approve", function () {
    let initialBalance;

    beforeEach(async function () {
      initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
    });

    describe("when the spender is not the zero address", function () {
      describe("when the sender has enough balance", function () {
        it("emits an approval event", async function () {
          const { logs } = await this.contract.approve(
            operator,
            initialBalance.toFixed(),
            {
              from: tokenOwner,
            }
          );

          expectEvent.inLogs(logs, "Approval", {
            owner: tokenOwner,
            spender: operator,
            value: initialBalance.toFixed(),
          });
        });

        describe("when there was no approved amount before", function () {
          it("approves the requested amount", async function () {
            await this.contract.approve(operator, initialBalance.toFixed(), {
              from: tokenOwner,
            });

            assert.equal(
              (await this.contract.allowance(tokenOwner, operator)).toString(),
              initialBalance.toFixed()
            );
          });
        });

        describe("when the spender had an approved amount", function () {
          beforeEach(async function () {
            await this.contract.approve(operator, new BN(1), {
              from: tokenOwner,
            });
          });

          it("approves the requested amount and replaces the previous one", async function () {
            await this.contract.approve(operator, initialBalance.toFixed(), {
              from: tokenOwner,
            });

            assert.equal(
              (await this.contract.allowance(tokenOwner, operator)).toString(),
              initialBalance.toFixed()
            );
          });
        });
      });

      describe("when the sender does not have enough balance", function () {
        let amount;

        beforeEach(async function () {
          amount = initialBalance.plus(1);
        });

        it("emits an approval event", async function () {
          const { logs } = await this.contract.approve(
            operator,
            amount.toFixed(),
            { from: tokenOwner }
          );

          expectEvent.inLogs(logs, "Approval", {
            owner: tokenOwner,
            spender: operator,
            value: amount.toFixed(),
          });
        });

        describe("when there was no approved amount before", function () {
          it("approves the requested amount", async function () {
            await this.contract.approve(operator, amount.toFixed(), {
              from: tokenOwner,
            });

            assert.equal(
              (await this.contract.allowance(tokenOwner, operator)).toString(),
              amount.toFixed()
            );
          });
        });

        describe("when the spender had an approved amount", function () {
          beforeEach(async function () {
            await this.contract.approve(operator, new BN(1), {
              from: tokenOwner,
            });
          });

          it("approves the requested amount and replaces the previous one", async function () {
            await this.contract.approve(operator, amount.toFixed(), {
              from: tokenOwner,
            });

            assert.equal(
              (await this.contract.allowance(tokenOwner, operator)).toString(),
              amount.toFixed()
            );
          });
        });
      });
    });

    describe("when the spender is the zero address", function () {
      it("reverts", async function () {
        await expectRevert(
          this.contract.approve(constants.ZERO_ADDRESS, initialBalance, {
            from: tokenOwner,
          }),
          `ERC20: approve to the zero address`
        );
      });
    });

    describe("decrease allowance", function () {
      describe("when the spender is not the zero address", function () {
        describe("when the sender has enough balance", function () {
          describe("when there was no approved amount before", function () {
            it("reverts", async function () {
              await expectRevert(
                this.contract.decreaseAllowance(
                  operator,
                  initialBalance.toFixed(),
                  {
                    from: tokenOwner,
                  }
                ),
                "ERC20: decreased allowance below zero"
              );
            });
          });

          describe("when the spender had an approved amount", function () {
            beforeEach(async function () {
              ({ logs: this.logs } = await this.contract.approve(
                operator,
                initialBalance.toFixed(),
                { from: tokenOwner }
              ));
            });

            it("emits an approval event", async function () {
              const { logs } = await this.contract.decreaseAllowance(
                operator,
                initialBalance.toFixed(),
                { from: tokenOwner }
              );

              expectEvent.inLogs(logs, "Approval", {
                owner: tokenOwner,
                spender: operator,
                value: new BN(0),
              });
            });

            it("decreases the spender allowance subtracting the requested amount", async function () {
              await this.contract.decreaseAllowance(
                operator,
                initialBalance.minus(1).toFixed(),
                { from: tokenOwner }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                "1"
              );
            });

            it("sets the allowance to zero when all allowance is removed", async function () {
              await this.contract.decreaseAllowance(
                operator,
                initialBalance.toFixed(),
                {
                  from: tokenOwner,
                }
              );
              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                "0"
              );
            });

            it("reverts when more than the full allowance is removed", async function () {
              await expectRevert(
                this.contract.decreaseAllowance(
                  operator,
                  initialBalance.plus(1).toFixed(),
                  {
                    from: tokenOwner,
                  }
                ),
                "ERC20: decreased allowance below zero"
              );
            });
          });
        });

        describe("when the sender does not have enough balance", function () {
          describe("when there was no approved amount before", function () {
            it("reverts", async function () {
              await expectRevert(
                this.contract.decreaseAllowance(
                  operator,
                  initialBalance.plus(1).toFixed(),
                  {
                    from: tokenOwner,
                  }
                ),
                "ERC20: decreased allowance below zero"
              );
            });
          });

          describe("when the spender had an approved amount", function () {
            beforeEach(async function () {
              ({ logs: this.logs } = await this.contract.approve(
                operator,
                initialBalance.plus(1).toFixed(),
                { from: tokenOwner }
              ));
            });

            it("emits an approval event", async function () {
              const { logs } = await this.contract.decreaseAllowance(
                operator,
                initialBalance.plus(1).toFixed(),
                { from: tokenOwner }
              );

              expectEvent.inLogs(logs, "Approval", {
                owner: tokenOwner,
                spender: operator,
                value: new BN(0),
              });
            });

            it("decreases the spender allowance subtracting the requested amount", async function () {
              await this.contract.decreaseAllowance(
                operator,
                initialBalance.plus(1).minus(1).toFixed(),
                { from: tokenOwner }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                "1"
              );
            });

            it("sets the allowance to zero when all allowance is removed", async function () {
              await this.contract.decreaseAllowance(
                operator,
                initialBalance.plus(1).toFixed(),
                {
                  from: tokenOwner,
                }
              );
              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                "0"
              );
            });

            it("reverts when more than the full allowance is removed", async function () {
              await expectRevert(
                this.contract.decreaseAllowance(
                  operator,
                  initialBalance.plus(1).plus(1).toFixed(),
                  {
                    from: tokenOwner,
                  }
                ),
                "ERC20: decreased allowance below zero"
              );
            });
          });
        });
      });

      describe("when the spender is the zero address", function () {
        const spender = constants.ZERO_ADDRESS;

        it("reverts", async function () {
          await expectRevert(
            this.contract.decreaseAllowance(spender, initialBalance.toFixed(), {
              from: tokenOwner,
            }),
            "ERC20: decreased allowance below zero"
          );
        });
      });
    });

    describe("increase allowance", function () {
      describe("when the spender is not the zero address", function () {
        describe("when the sender has enough balance", function () {
          it("emits an approval event", async function () {
            const { logs } = await this.contract.increaseAllowance(
              operator,
              initialBalance.toFixed(),
              {
                from: tokenOwner,
              }
            );

            expectEvent.inLogs(logs, "Approval", {
              owner: tokenOwner,
              spender: operator,
              value: initialBalance.toFixed(),
            });
          });

          describe("when there was no approved amount before", function () {
            it("approves the requested amount", async function () {
              await this.contract.increaseAllowance(
                operator,
                initialBalance.toFixed(),
                {
                  from: tokenOwner,
                }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                initialBalance.toFixed()
              );
            });
          });

          describe("when the spender had an approved amount", function () {
            beforeEach(async function () {
              await this.contract.approve(operator, new BN(1), {
                from: tokenOwner,
              });
            });

            it("increases the spender allowance adding the requested amount", async function () {
              await this.contract.increaseAllowance(
                operator,
                initialBalance.toFixed(),
                {
                  from: tokenOwner,
                }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                initialBalance.plus(1).toFixed()
              );
            });
          });
        });

        describe("when the sender does not have enough balance", function () {
          it("emits an approval event", async function () {
            const { logs } = await this.contract.increaseAllowance(
              operator,
              initialBalance.plus(1).toFixed(),
              {
                from: tokenOwner,
              }
            );

            expectEvent.inLogs(logs, "Approval", {
              owner: tokenOwner,
              spender: operator,
              value: initialBalance.plus(1).toFixed(),
            });
          });

          describe("when there was no approved amount before", function () {
            it("approves the requested amount", async function () {
              await this.contract.increaseAllowance(
                operator,
                initialBalance.plus(1).toFixed(),
                {
                  from: tokenOwner,
                }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                initialBalance.plus(1).toFixed()
              );
            });
          });

          describe("when the spender had an approved amount", function () {
            beforeEach(async function () {
              await this.contract.approve(operator, new BN(1), {
                from: tokenOwner,
              });
            });

            it("increases the spender allowance adding the requested amount", async function () {
              await this.contract.increaseAllowance(
                operator,
                initialBalance.plus(1).toFixed(),
                {
                  from: tokenOwner,
                }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, operator)
                ).toString(),
                initialBalance.plus(2).toFixed()
              );
            });
          });
        });
      });

      describe("when the spender is the zero address", function () {
        const spender = constants.ZERO_ADDRESS;

        it("reverts", async function () {
          await expectRevert(
            this.contract.increaseAllowance(spender, "1", {
              from: tokenOwner,
            }),
            "ERC20: approve to the zero address"
          );
        });
      });
    });
  });
};
