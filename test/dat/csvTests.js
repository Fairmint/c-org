const Papa = require("papaparse");
const fs = require("fs");
const BigNumber = require("bignumber.js");
const { constants, deployDat, updateDatConfig } = require("../helpers");
const sheets = require("./test-data/script.json");

const daiArtifact = artifacts.require("TestDai");

contract("dat / csvTests", accounts => {
  const beneficiary = accounts[0];
  const control = accounts[1];
  const feeCollector = accounts[2];
  const ethBank = accounts[98];
  const TRANSFER_GAS_COST = new BigNumber("22000").times("100000000000");
  /**
   * TODO add both false and true
   * Maybe to cover gas costs we before each tx send them x ETH, then after the tx calc the actual cost and ask for a refund - but that also has a gas cost.
   * But a well known cost.
   */

  const usingEth = [false];

  let dai;
  let dat;
  let fse;

  let initComplete;

  beforeEach(async () => {
    await resetEthBalances();
  });

  after(async () => {
    initComplete = false;
    await resetEthBalances();
  });

  it("should spam the first balance reset before sheet tests begin", () => {
    initComplete = true;
  });

  sheets.forEach(sheet => {
    usingEth.forEach(isUsingEth => {
      const sheetTitle = `TS ${sheet.id} ${sheet.name} w/ ${
        isUsingEth ? "ETH" : "DAI"
      }`;

      describe(`Starting ${sheetTitle}`, () => {
        beforeEach(async () => {
          if (isUsingEth) {
            dai = undefined;
          } else {
            dai = await daiArtifact.new();
          }

          await setInitialBalances(sheet);
        });

        it(`${sheetTitle} complete`, async () => {
          if (sheet.disabled) {
            return console.log("Test skipped.");
          }
          await deployAndConfigDat(sheet, isUsingEth);
          await runTestScript(sheet);
        });
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
    const investmentReserve = parsePercent(configJson.investment_reserve);
    const revenueCommitement = parsePercent(configJson.revenue_commitment);
    const fee = parsePercent(configJson.fee);
    [dat, fse] = await deployDat(
      {
        beneficiary,
        buySlopeNum: new BigNumber(buySlope[0]).toFixed(),
        buySlopeDen: new BigNumber(buySlope[1]).shiftedBy(18).toFixed(),
        investmentReserveNum: new BigNumber(investmentReserve[0]).toFixed(),
        investmentReserveDen: new BigNumber(investmentReserve[1]).toFixed(),
        revenueCommitementNum: new BigNumber(revenueCommitement[0]).toFixed(),
        revenueCommitementDen: new BigNumber(revenueCommitement[1]).toFixed(),
        initGoal: parseNumber(configJson.init_goal)
          .shiftedBy(18)
          .toFixed(),
        initReserve: parseNumber(configJson.init_reserve)
          .shiftedBy(18)
          .toFixed(),
        currency: dai ? dai.address : constants.ZERO_ADDRESS
      },
      control
    );
    await updateDatConfig(
      dat,
      fse,
      {
        feeCollector,
        feeNum: new BigNumber(fee[0]).toFixed(),
        feeDen: new BigNumber(fee[1]).toFixed()
      },
      control
    );
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
      await setBalanceTo(dai, parseInt(row.AccId), row.InitialBalance);
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
      await checkPostConiditons(row);
      await logState();
    } else {
      console.log("\t(skipping no-op)");
    }
  }

  async function loadAccount(row) {
    const id = parseInt(row.AccId);
    const address = accounts[id];
    row.account = {
      id,
      address,
      eth: new BigNumber(await web3.eth.getBalance(address)),
      fse: new BigNumber(await fse.balanceOf(address)),
      dai: new BigNumber(dai ? await dai.balanceOf(address) : 0)
    };

    if (dai && (await dai.allowance(row.account.address, dat.address)) == 0) {
      await approveSpending(row.account.id);
    }

    console.log(
      `\tAccount #${row.account.id}: $${row.account.dai
        .shiftedBy(-18)
        .toFormat()} DAI and ${row.account.fse.shiftedBy(-18).toFormat()} FSE`
    );
  }

  async function loadAction(row) {
    let log;

    switch (row.Action) {
      case "buy":
        log = `for $${parseNumber(row.BuyQty).toFormat()} DAI`;
        break;
      case "sell":
        if (
          (!row.SellQty || parseNumber(row.SellQty).eq(0)) &&
          row.account.fse.eq(0)
        ) {
          row.skip = true;
          log = `with nothing to sell (SKIP)`;
        } else {
          if (
            parseNumber(row.SellQty).eq(0) ||
            parseNumber(row.SellQty)
              .plus(new BigNumber(1))
              .shiftedBy(18)
              .gt(row.account.fse)
          ) {
            row.SellQty = row.account.fse.shiftedBy(-18);
          }
          log = `${parseNumber(row.SellQty).toFormat()} FSE`;
        }
        break;
      case "close":
        log = "";
        break;
      case "pay":
        log = `$${parseNumber(row.BuyQty).toFormat()}`;
        break;
      case "xfer":
        log = `${parseNumber(row.BuyQty || row.SellQty).toFormat()} ${
          row.BuyQty ? "dia" : "fse"
        } to #${parseInt(row.xferTargetAcc)}`;
        break;
      default:
        throw new Error(`Missing action ${row.Action}`);
    }

    console.log(`Row ${row.id}: #${row.AccId} ${row.Action} ${log}`);
  }

  async function executeAction(row) {
    const quantity = new BigNumber(
      parseNumber(row.BuyQty || row.SellQty)
    ).shiftedBy(18);

    // for xfer
    const isCurrency = !row.SellQty;
    const targetAddress = accounts[parseInt(row.xferTargetAcc)];

    switch (row.Action) {
      case "buy":
        await dat.buy(row.account.address, quantity.toFixed(), 1, {
          from: row.account.address
        });
        break;
      case "sell":
        await dat.sell(quantity.toFixed(), 1, {
          from: row.account.address
        });
        break;
      case "close":
        await dat.close({ from: row.account.address });
        break;
      case "pay":
        await dat.pay(quantity.toFixed(), { from: row.account.address });
        break;
      case "xfer":
        if (isCurrency) {
          if (dai) {
            await dai.transfer(targetAddress, quantity.toFixed(), {
              from: row.account.address
            });
          } else {
            await web3.eth.sendTransaction({
              from: row.account.address,
              to: targetAddress,
              value: quantity.toFixed()
            });
          }
        } else {
          await fse.transfer(targetAddress, quantity.toFixed(), {
            from: row.account.address
          });
        }
        break;
      default:
        throw new Error(`Missing action ${row.Action}`);
    }
  }

  async function checkPreConditions(row) {
    await assertBalance(fse, row.account.address, row.PreviousFSEBal);
    await assertBalance(dai, row.account.address, row.PreviousDAIBal);
  }

  async function checkPostConiditons(row) {
    await assertBalance(fse, row.account.address, row.FSEBalanceOfAcct);
    await assertBalance(dai, row.account.address, row.DAIBalanceOfAcct);
    await assertBalance(dai, feeCollector, row.TotalDAISentToFeeCollector);
    assertAlmostEqual(
      new BigNumber(await fse.totalSupply()),
      parseNumber(row.FSETotalSupply).shiftedBy(18)
    );
    assertAlmostEqual(
      new BigNumber(await fse.burnedSupply()),
      parseNumber(row.FSEBurnedSupply).shiftedBy(18)
    );
    assertAlmostEqual(
      new BigNumber(await dat.buybackReserve()),
      parseNumber(row.DAIBuybackReserve).shiftedBy(18)
    );
    assert.equal((await dat.state()).toString(), parseState(row.State));
  }

  async function logState() {
    let state = await dat.state();
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
    const totalSupply = new BigNumber(await fse.totalSupply());
    const burnedSupply = new BigNumber(await fse.burnedSupply());
    const buybackReserve = new BigNumber(await dat.buybackReserve());
    const beneficiaryDaiBalance = new BigNumber(
      dai
        ? await dai.balanceOf(beneficiary)
        : await web3.eth.getBalance(beneficiary)
    );
    const beneficiaryFseBalance = new BigNumber(
      await fse.balanceOf(beneficiary)
    );
    const feeCollectorDaiBalance = new BigNumber(
      dai
        ? await dai.balanceOf(feeCollector)
        : await web3.eth.getBalance(feeCollector)
    );
    const feeCollectorFseBalance = new BigNumber(
      await fse.balanceOf(feeCollector)
    );
    console.log(`\tState: ${state}
\tSupply: ${totalSupply
      .shiftedBy(-18)
      .toFormat()} FSE + ${burnedSupply.shiftedBy(-18).toFormat()} burned
\tReserve: $${buybackReserve.shiftedBy(-18).toFormat()} DAI
\tBeneficiary: $${beneficiaryDaiBalance
      .shiftedBy(-18)
      .toFormat()} DAI and ${beneficiaryFseBalance
      .shiftedBy(-18)
      .toFormat()} FSE
\tFee Collector: $${feeCollectorDaiBalance
      .shiftedBy(-18)
      .toFormat()} DAI and ${feeCollectorFseBalance
      .shiftedBy(-18)
      .toFormat()} FSE`);
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
    if (typeof numberString === "object") return new BigNumber(numberString);
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

  function parsePercent(percentString) {
    return parseNumber(percentString.replace("%", ""))
      .div(100)
      .toFraction();
  }

  function assertAlmostEqual(a, b) {
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
      new BigNumber(a)
        .div(b)
        .minus(1)
        .abs()
        .lt(0.0001) // Allow up to .01% error from expected value
    )
      return true;

    throw new Error(
      `Values not equal ${new BigNumber(a)
        .shiftedBy(-18)
        .toFormat()} vs ${new BigNumber(b).shiftedBy(-18).toFormat()}`
    );
  }

  async function assertBalance(token, account, expectedBalance) {
    expectedBalance = parseNumber(expectedBalance);
    expectedBalance = expectedBalance.shiftedBy(18);
    const balance = new BigNumber(await token.balanceOf(account));
    assertAlmostEqual(balance, expectedBalance);
    return balance;
  }

  async function setBalanceTo(token, accountId, targetBalance) {
    const account = accounts[accountId];
    if (account === ethBank) return;

    targetBalance = parseNumber(targetBalance);

    if (token) {
      if (targetBalance.eq(0)) return;
      console.log(`  #${accountId} mint $${targetBalance.toFormat()} DAI`);
      await token.mint(account, targetBalance.shiftedBy(18).toFixed());
    } else {
      const currentBalance = new BigNumber(
        web3.utils.fromWei(await web3.eth.getBalance(account), "ether")
      );
      let amount = currentBalance.minus(targetBalance);
      let action;
      if (amount.eq(0)) {
        return;
      } else if (amount.gt(0)) {
        action = "burn";
        amount = amount.minus(TRANSFER_GAS_COST.shiftedBy(-18));
      } else {
        amount = amount.times(-1);
        action = "mint";
      }
      if (amount.lt(0)) {
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
      await web3.eth.sendTransaction({
        from,
        to,
        value: amount.shiftedBy(18).toFixed()
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

  async function approveSpending(accountId) {
    console.log(`  Set #${accountId} to approve dat`);
    const account = accounts[accountId];
    await dai.approve(dat.address, -1, { from: account });
  }

  async function resetEthBalances() {
    if (initComplete) {
      console.log("Reset ETH balances:");
    }
    for (let i = 0; i < accounts.length; i++) {
      await setBalanceTo(undefined, i, new BigNumber(10000));
    }
  }
});
