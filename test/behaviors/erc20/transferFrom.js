const BigNumber = require("bignumber.js");
const {
  constants,
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers");

/**
 * Requires `this.contract`
 */
module.exports = function (tokenOwner, nonTokenHolder, operator) {
  describe("Behavior / ERC20 / transferFrom", function () {
    let initialBalance;

    beforeEach(async function () {
      initialBalance = new BigNumber(await this.contract.balanceOf(tokenOwner));
    });

    it("has expected balance before transfer", async function () {
      assert.equal(
        (await this.contract.balanceOf(tokenOwner)).toString(),
        initialBalance.toFixed()
      );
      assert.equal(await this.contract.balanceOf(nonTokenHolder), 0);
    });

    describe("can transfer funds", function () {
      const transferAmount = 42;

      beforeEach(async function () {
        await this.contract.approve(operator, -1, { from: tokenOwner });
        await this.contract.transferFrom(
          tokenOwner,
          nonTokenHolder,
          transferAmount,
          {
            from: operator,
          }
        );
      });

      it("has expected after after transfer", async function () {
        assert.equal(
          (await this.contract.balanceOf(tokenOwner)).toString(),
          initialBalance.minus(transferAmount).toFixed()
        );
        assert.equal(
          (await this.contract.balanceOf(nonTokenHolder)).toString(),
          transferAmount
        );
      });
    });

    describe("when the token owner is not the zero address", function () {
      describe("when the recipient is not the zero address", function () {
        describe("when the spender has enough approved balance", function () {
          beforeEach(async function () {
            await this.contract.approve(operator, initialBalance, {
              from: tokenOwner,
            });
          });

          describe("when the token owner has enough balance", function () {
            it("transfers the requested amount", async function () {
              await this.contract.transferFrom(
                tokenOwner,
                nonTokenHolder,
                initialBalance.toFixed(),
                {
                  from: operator,
                }
              );

              assert.equal(
                (await this.contract.balanceOf(tokenOwner)).toString(),
                "0"
              );

              assert.equal(
                (await this.contract.balanceOf(nonTokenHolder)).toString(),
                initialBalance.toFixed()
              );
            });

            it("decreases the spender allowance", async function () {
              await this.contract.transferFrom(
                tokenOwner,
                nonTokenHolder,
                initialBalance.toFixed(),
                {
                  from: operator,
                }
              );

              assert.equal(
                (
                  await this.contract.allowance(tokenOwner, tokenOwner)
                ).toString(),
                "0"
              );
            });

            it("emits a transfer event", async function () {
              const { logs } = await this.contract.transferFrom(
                tokenOwner,
                nonTokenHolder,
                initialBalance.toFixed(),
                { from: operator }
              );

              expectEvent.inLogs(logs, "Transfer", {
                from: tokenOwner,
                to: nonTokenHolder,
                value: initialBalance.toFixed(),
              });
            });

            it("emits an approval event", async function () {
              const { logs } = await this.contract.transferFrom(
                tokenOwner,
                nonTokenHolder,
                initialBalance.toFixed(),
                { from: operator }
              );

              expectEvent.inLogs(logs, "Approval", {
                owner: tokenOwner,
                spender: operator,
                value: await this.contract.allowance(tokenOwner, operator),
              });
            });
          });

          describe("when the token owner does not have enough balance", function () {
            it("reverts", async function () {
              await expectRevert(
                this.contract.transferFrom(
                  tokenOwner,
                  nonTokenHolder,
                  initialBalance.plus(1).toFixed(),
                  {
                    from: operator,
                  }
                ),
                "INSUFFICIENT_BALANCE"
              );
            });
          });
        });

        describe("when the spender does not have enough approved balance", function () {
          beforeEach(async function () {
            await this.contract.approve(
              operator,
              initialBalance.minus(1).toFixed(),
              {
                from: tokenOwner,
              }
            );
          });

          describe("when the token owner has enough balance", function () {
            it("reverts", async function () {
              await expectRevert(
                this.contract.transferFrom(
                  tokenOwner,
                  nonTokenHolder,
                  initialBalance.toFixed(),
                  {
                    from: operator,
                  }
                ),
                "ERC20: transfer amount exceeds allowance"
              );
            });
          });

          describe("when the token owner does not have enough balance", function () {
            let amount;

            beforeEach(async function () {
              amount = initialBalance.plus(1);
            });

            it("reverts", async function () {
              await expectRevert(
                this.contract.transferFrom(
                  tokenOwner,
                  nonTokenHolder,
                  amount.toFixed(),
                  {
                    from: operator,
                  }
                ),
                "INSUFFICIENT_BALANCE"
              );
            });
          });
        });
      });

      describe("when the recipient is the zero address", function () {
        beforeEach(async function () {
          await this.contract.approve(operator, initialBalance.toFixed(), {
            from: tokenOwner,
          });
        });

        it("reverts", async function () {
          await expectRevert(
            this.contract.transferFrom(
              tokenOwner,
              constants.ZERO_ADDRESS,
              initialBalance.toFixed(),
              { from: operator }
            ),
            `ERC20: transfer to the zero address`
          );
        });
      });
    });

    describe("when the token owner is the zero address", function () {
      const amount = 0;

      it("reverts", async function () {
        await expectRevert(
          this.contract.transferFrom(
            constants.ZERO_ADDRESS,
            nonTokenHolder,
            amount,
            {
              from: operator,
            }
          ),
          `ERC20: transfer from the zero address`
        );
      });
    });
  });
};
