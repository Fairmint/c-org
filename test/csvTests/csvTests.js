const Papa = require("papaparse");
const fs = require("fs");
const BigNumber = require("bignumber.js");
const { approveAll, constants, deployDat, getGasCost } = require("../helpers");
const sheets = require("./test-data/script.json");

const { tokens } = require("hardlydifficult-ethereum-contracts");

contract("dat / csvTests", (accounts) => {
  const beneficiary = accounts[0];
  const control = accounts[1];
  const feeCollector = accounts[2];
  const ethBank = accounts[98];
  const TRANSFER_GAS_COST = new BigNumber("22000").times("100000000000");
  const GAS_COST_BUFFER = new BigNumber("2200000").times("100000000000");

  const tokenType = [undefined, "dai", "usdc"];

  let initComplete;
  sheets.forEach((sheet) => {
    tokenType.forEach((tokenArtifact) => {
      let contracts;
      let currency;
      let currencyString;
      let currencyDecimals;

      beforeEach(async () => {
        if (!tokenArtifact) {
          currency = undefined;
          currencyString = "ETH";
          currencyDecimals = 18;
        } else {
          if (tokenArtifact == "usdc") {
            currency = await tokens.usdc.deploy(web3, accounts[80], control);
          } else {
            currency = await tokens.dai.deploy(web3, control);
          }
          currencyString = await currency.symbol();
          currencyDecimals = parseInt((await currency.decimals()).toString());
        }

        await resetEthBalances();
      });

      after(async () => {
        initComplete = false;
        await resetEthBalances();
      });

      describe("Prep currency", () => {
        const sheetTitle = `TS ${sheet.id} ${sheet.name} w/ ${
          tokenArtifact ? tokenArtifact.contractName : "ETH"
        }`;

        describe(`Starting ${sheetTitle}`, () => {
          beforeEach(async () => {
            if (sheet.disabled) return;

            await setInitialBalances(sheet);
          });

          it(`${sheetTitle} complete`, async () => {
            if (sheet.disabled) {
              return console.log("Test skipped.");
            }
            await deployAndConfigDat(sheet);
            await approveAll(contracts, accounts);
            await contracts.whitelist.approveNewUsers([ethBank], [4], {
              from: await contracts.dat.control(),
            });
            await runTestScript(sheet);
          });
        });
      });

      async function deployAndConfigDat(sheet) {
        const configJson = Papa.parse(
          fs.readFileSync(
            `${__dirname}/test-data/${sheet.name} Configuration.csv`,
            "utf8"
          ),
          { header: true }
        ).data[0];

        const buySlope = parseFraction(configJson.buy_slope);
        const investmentReserve = parseBasisPoints(
          configJson.investment_reserve
        );
        const revenueCommitment = parseBasisPoints(
          configJson.revenue_commitment
        );
        const fee = parseBasisPoints(configJson.fee);
        contracts = await deployDat(accounts, {
          buySlopeNum: new BigNumber(buySlope[0]).toFixed(),
          buySlopeDen: new BigNumber(buySlope[1])
            .shiftedBy(18 + (18 - currencyDecimals))
            .toFixed(),
          investmentReserveBasisPoints: new BigNumber(
            investmentReserve
          ).toFixed(),
          revenueCommitmentBasisPoints: new BigNumber(
            revenueCommitment
          ).toFixed(),
          initGoal: parseNumber(configJson.init_goal).shiftedBy(18).toFixed(),
          initReserve: parseNumber(configJson.init_reserve)
            .shiftedBy(18)
            .toFixed(),
          currency: currency ? currency.address : constants.ZERO_ADDRESS,
          feeBasisPoints: new BigNumber(fee).toFixed(),
          minInvestment: new BigNumber(100)
            .shiftedBy(currencyDecimals)
            .toFixed(),
        });
      }

      async function setInitialBalances(sheet) {
        const balanceJson = Papa.parse(
          fs.readFileSync(
            `${__dirname}/test-data/${sheet.name} InitBalances.csv`,
            "utf8"
          ),
          { header: true }
        ).data;

        console.log("Set initial balances:");
        for (let i = 0; i < balanceJson.length; i++) {
          const row = balanceJson[i];
          await setBalanceTo(currency, parseInt(row.AccId), row.InitialBalance);
        }
      }

      async function runTestScript(sheet) {
        const sheetJson = Papa.parse(
          fs.readFileSync(
            `${__dirname}/test-data/${sheet.name} Script.csv`,
            "utf8"
          ),
          { header: true }
        ).data;

        console.log("START SCRIPT:");
        await logState();
        for (let i = 0; i < sheetJson.length; i++) {
          const row = sheetJson[i];
          row.id = i;
          await runTestRow(row);
        }
      }

      async function runTestRow(row) {
        await loadAccount(row);
        await loadAction(row);
        if (!row.skip) {
          await checkPreConditions(row);
          await executeAction(row);
          await loadAccount(row);
          await logState();
          await checkPostConditions(row);
        } else {
          console.log("\t(skipping no-op)");
        }
      }

      async function loadAccount(row) {
        const id = parseInt(row.AccId);
        const address = accounts[id];
        if (!address) throw new Error("Missing account!");
        row.account = {
          id,
          address,
          eth: new BigNumber(await web3.eth.getBalance(address)),
          fair: new BigNumber(await contracts.dat.balanceOf(address)),
          currency: new BigNumber(
            currency ? await currency.balanceOf(address) : 0
          ),
        };

        if (currency) {
          if (
            currency.allowance &&
            (await currency.allowance(
              row.account.address,
              contracts.dat.address
            )) == 0
          ) {
            console.log(`  Set #${row.account.id} to approve dat`);
            await currency.approve(contracts.dat.address, -1, {
              from: row.account.address,
            });
          }
        }

        console.log(
          `\tAccount #${row.account.id}: ${(currency
            ? row.account.currency
            : row.account.eth
          )
            .shiftedBy(-1 * currencyDecimals)
            .toFormat()} ${currencyString} and ${row.account.fair
            .shiftedBy(-18)
            .toFormat()} FAIR`
        );
      }

      async function loadAction(row) {
        let log;

        switch (row.Action) {
          case "buy":
            log = `for ${parseNumber(row.BuyQty).toFormat()} ${currencyString}`;
            break;
          case "sell":
            if (
              (!row.SellQty || parseNumber(row.SellQty).eq(0)) &&
              row.account.fair.eq(0)
            ) {
              row.skip = true;
              log = `with nothing to sell (SKIP)`;
            } else {
              if (
                parseNumber(row.SellQty).eq(0) ||
                parseNumber(row.SellQty)
                  .plus(new BigNumber(1))
                  .shiftedBy(18)
                  .gt(row.account.fair)
              ) {
                row.SellQty = row.account.fair.shiftedBy(-18);
              }
              log = `${parseNumber(row.SellQty).toFormat()} FAIR`;
            }
            break;
          case "close":
            log = "";
            break;
          case "pay":
            log = `${parseNumber(row.BuyQty).toFormat()}`;
            break;
          case "xfer":
            log = `${parseNumber(row.BuyQty || row.SellQty).toFormat()} ${
              row.BuyQty ? "DAI" : "FAIR"
            } to #${parseInt(row.xferTargetAcc)}`;
            break;
          case "burn":
            log = `${parseNumber(row.BurnQty).toFormat()} FAIR`;
            break;
          default:
            throw new Error(`Missing action ${row.Action}`);
        }

        console.log(`Row ${row.id}: #${row.AccId} ${row.Action} ${log}`);
      }

      async function executeAction(row) {
        let quantity = new BigNumber(
          parseNumber(row.BuyQty || row.SellQty || row.BurnQty)
        );
        if (row.BuyQty) {
          quantity = quantity.shiftedBy(currencyDecimals);
        } else {
          quantity = quantity.shiftedBy(18);
        }

        // for xfer
        const isCurrency = !row.SellQty;
        const targetAddress = accounts[parseInt(row.xferTargetAcc)];

        await sendPrepaidGas(row);

        let tx;
        switch (row.Action) {
          case "buy":
            tx = await contracts.dat.buy(
              row.account.address,
              quantity.toFixed(),
              1,
              {
                from: row.account.address,
                value: currency ? 0 : quantity.toFixed(),
              }
            );
            break;
          case "sell":
            tx = await contracts.dat.sell(
              row.account.address,
              quantity.toFixed(),
              1,
              {
                from: row.account.address,
              }
            );
            break;
          case "close":
            tx = await contracts.dat.close({
              from: row.account.address,
              value: currency
                ? 0
                : new BigNumber(await web3.eth.getBalance(row.account.address))
                    .minus(GAS_COST_BUFFER)
                    .toFixed(),
            });
            break;
          case "pay":
            tx = await contracts.dat.pay(quantity.toFixed(), {
              from: row.account.address,
              value: currency ? 0 : quantity.toFixed(),
            });
            break;
          case "xfer":
            if (isCurrency) {
              if (currency) {
                tx = await currency.transfer(
                  targetAddress,
                  quantity.toFixed(),
                  {
                    from: row.account.address,
                  }
                );
              } else {
                tx = await web3.eth.sendTransaction({
                  from: row.account.address,
                  to: targetAddress,
                  value: quantity.toFixed(),
                });
              }
            } else {
              tx = await contracts.dat.transfer(
                targetAddress,
                quantity.toFixed(),
                {
                  from: row.account.address,
                }
              );
            }
            break;
          case "burn":
            tx = await contracts.dat.burn(quantity.toFixed(), {
              from: row.account.address,
            });
            break;
          default:
            throw new Error(`Missing action ${row.Action}`);
        }

        await refundPrepaidGas(row, tx);
      }

      async function checkPreConditions(row) {
        await assertBalance(
          contracts.dat,
          row.account.address,
          row.PreviousFAIRBal
        );
        await assertBalance(currency, row.account.address, row.PreviousDAIBal);
      }

      async function checkPostConditions(row) {
        await assertBalance(
          contracts.dat,
          row.account.address,
          row.FAIRBalanceOfAcct,
          "FAIRBalanceOfAcct"
        );
        await assertBalance(
          currency,
          row.account.address,
          row.DAIBalanceOfAcct,
          "DAIBalanceOfAcct"
        );
        await assertBalance(
          currency,
          feeCollector,
          row.TotalDAISentToFeeCollector,
          "TotalDAISentToFeeCollector"
        );
        assertAlmostEqual(
          new BigNumber(await contracts.dat.totalSupply()),
          parseNumber(row.FAIRTotalSupply).shiftedBy(18)
        );
        assertAlmostEqual(
          new BigNumber(await contracts.dat.burnedSupply()),
          parseNumber(row.FAIRBurnedSupply).shiftedBy(18)
        );
        assertAlmostEqual(
          new BigNumber(await contracts.dat.buybackReserve()),
          parseNumber(row.DAIBuybackReserve).shiftedBy(currencyDecimals)
        );
        assert.equal(
          (await contracts.dat.state()).toString(),
          parseState(row.State)
        );
      }

      async function logState() {
        let state = await contracts.dat.state();
        if (state == "0") {
          state = "init";
        } else if (state == "1") {
          state = "run";
        } else if (state == "2") {
          state = "close";
        } else if (state == "3") {
          state = "cancel";
        } else {
          throw new Error(`Missing state: ${state}`);
        }
        const totalSupply = new BigNumber(await contracts.dat.totalSupply());
        const burnedSupply = new BigNumber(await contracts.dat.burnedSupply());
        const buybackReserve = new BigNumber(
          await contracts.dat.buybackReserve()
        );
        const beneficiaryDaiBalance = new BigNumber(
          currency
            ? await currency.balanceOf(beneficiary)
            : await web3.eth.getBalance(beneficiary)
        );
        const beneficiaryFairBalance = new BigNumber(
          await contracts.dat.balanceOf(beneficiary)
        );
        const feeCollectorDaiBalance = new BigNumber(
          currency
            ? await currency.balanceOf(feeCollector)
            : await web3.eth.getBalance(feeCollector)
        );
        const feeCollectorFairBalance = new BigNumber(
          await contracts.dat.balanceOf(feeCollector)
        );
        console.log(`\tState: ${state}
\tSupply: ${totalSupply
          .shiftedBy(-18)
          .toFormat()} FAIR + ${burnedSupply.shiftedBy(-18).toFormat()} burned
\tReserve: ${buybackReserve
          .shiftedBy(-1 * currencyDecimals)
          .toFormat()} ${currencyString}
\tBeneficiary: ${beneficiaryDaiBalance
          .shiftedBy(-1 * currencyDecimals)
          .toFormat()} ${currencyString} and ${beneficiaryFairBalance
          .shiftedBy(-18)
          .toFormat()} FAIR
\tFee Collector: ${feeCollectorDaiBalance
          .shiftedBy(-1 * currencyDecimals)
          .toFormat()} ${currencyString} and ${feeCollectorFairBalance
          .shiftedBy(-18)
          .toFormat()} FAIR`);
      }

      function parseState(state) {
        if (state === "init") {
          return 0;
        } else if (state === "run") {
          return 1;
        } else if (state === "close") {
          return 2;
        } else if (state === "cancel") {
          return 3;
        }
        throw new Error(`Missing state: ${state}`);
      }

      function parseNumber(numberString) {
        if (!numberString) return new BigNumber(0);
        if (typeof numberString === "object")
          return new BigNumber(numberString);
        return new BigNumber(
          numberString
            .replace("$", "")
            .replace(new RegExp(",", "g"), ".")
            .replace(new RegExp(" ", "g"), "")
            .replace(new RegExp("\u202F", "g"), "")
        );
      }

      function parseFraction(percentString) {
        return parseNumber(percentString).toFraction();
      }

      function parseBasisPoints(percentString) {
        return parseNumber(percentString.replace("%", "")).times(100);
      }

      function assertAlmostEqual(a, b, message) {
        const aStr = new BigNumber(a)
          .div(100000000000000000) // Rounding errors
          .dp(0)
          .toFixed();
        const bStr = new BigNumber(b)
          .div(100000000000000000) // Rounding errors
          .dp(0)
          .toFixed();
        if ((aStr != "0" && aStr == bStr) || (aStr == "0" && bStr == "0"))
          return true;

        if (
          new BigNumber(a).div(b).minus(1).abs().lt(0.00001) // Allow up to .001% error from expected value
        )
          return true;

        throw new Error(
          `Values not equal ${new BigNumber(a)
            .shiftedBy(-18)
            .toFormat()} vs ${new BigNumber(b)
            .shiftedBy(-18)
            .toFormat()} (assuming 18 decimals): ${message}`
        );
      }

      async function assertBalance(token, account, expectedBalance, message) {
        expectedBalance = parseNumber(expectedBalance);
        expectedBalance = expectedBalance.shiftedBy(
          token == contracts.dat ? 18 : currencyDecimals
        );
        const balance = new BigNumber(
          token
            ? await token.balanceOf(account)
            : await web3.eth.getBalance(account)
        );
        assertAlmostEqual(balance, expectedBalance, message);
        return balance;
      }

      async function sendPrepaidGas(row) {
        await web3.eth.sendTransaction({
          from: ethBank,
          to: row.account.address,
          value: GAS_COST_BUFFER.toFixed(),
        });
      }

      async function refundPrepaidGas(row, tx) {
        let amount = await getGasCost(tx);
        amount = GAS_COST_BUFFER.minus(amount).minus(TRANSFER_GAS_COST);

        if (amount.lte(0)) return;
        await web3.eth.sendTransaction({
          from: row.account.address,
          to: ethBank,
          value: amount.toFixed(),
        });
      }

      async function resetEthBalances() {
        if (initComplete) {
          console.log("Reset ETH balances:");
        }
        for (let i = 0; i < accounts.length; i++) {
          await setBalanceTo(undefined, i, new BigNumber(100000));
        }
      }

      async function setBalanceTo(token, accountId, targetBalance) {
        const account = accounts[accountId];
        if (account === ethBank) return;
        if (!token && account === control) {
          targetBalance = new BigNumber(1000);
        }

        targetBalance = parseNumber(targetBalance);

        if (token) {
          if (targetBalance.eq(0)) return;
          console.log(`  #${accountId} mint ${targetBalance.toFormat()} DAI`);
          await token.mint(
            account,
            targetBalance.shiftedBy(currencyDecimals).toFixed(),
            {
              from: control,
            }
          );
        } else {
          const currentBalance = new BigNumber(
            web3.utils.fromWei(await web3.eth.getBalance(account), "ether")
          );
          let amount = currentBalance.minus(targetBalance);
          let action;
          if (amount.gt(0)) {
            action = "burn";
            amount = amount.minus(TRANSFER_GAS_COST.shiftedBy(-18));
          } else {
            amount = amount.times(-1);
            action = "mint";
          }
          if (amount.lte(0.000001)) {
            return; // value is very close already
          }
          let from, to;
          if (action == "mint") {
            from = ethBank;
            to = account;
          } else {
            from = account;
            to = ethBank;
          }
          if (initComplete) {
            console.log(
              `${from} ${new BigNumber(
                web3.utils.fromWei(await web3.eth.getBalance(from), "ether")
              ).toFormat()} -> ${to}: ${amount.toFormat()}`
            );
          }
          await web3.eth.sendTransaction({
            from,
            to,
            value: amount.shiftedBy(18).toFixed(),
          });

          const afterBalance = new BigNumber(
            web3.utils.fromWei(await web3.eth.getBalance(account), "ether")
          );
          if (initComplete) {
            console.log(
              `  #${accountId} ${action} ETH ${amount.toFormat()} (before ${currentBalance.toFormat()} / after ${afterBalance.toFormat()}) `
            );
          }
        }
      }
    });
  });
});
