const { deployDat, updateDatConfig } = require("../helpers");
const Papa = require("papaparse");
const fs = require("fs");
const BigNumber = require("bignumber.js");

const daiArtifact = artifacts.require("TestDai");

let dai;
let dat;
let fse;
let sheetJson;
let beneficiary;
let control;
let feeCollector;
let accounts;
let spentByBeneficiary = new BigNumber(0);

contract("dat / csvTests", () => {
  before(async () => {
    accounts = await web3.eth.getAccounts();
    beneficiary = accounts[0];
    control = accounts[1];
    feeCollector = accounts[2];
  });

  it("TS 1", async () => {
    await testSheet("buy_sell-nopremint");
  });

  it("TS 2", async () => {
    await testSheet("buy_sell_1000-premint");
  });

  it("TS 3", async () => {
    await testSheet("buy_sell_large_numbers");
  });

  it("TS 4", async () => {
    await testSheet("buy_close_sell_nopremint");
  });

  it("TS 5", async () => {
    await testSheet("buy_close_sell_premint");
  });

  it("TS 6", async () => {
    await testSheet("buy_pay_close-no-premint");
  });

  it.only("TS 7", async () => {
    await testSheet("buy_sell_xfer_pay_close-nopremint");
  });
});

async function testSheet(sheetName) {
  console.log(`STARTING NEW SHEET TEST: '${sheetName}'`);
  const configJson = Papa.parse(
    fs.readFileSync(
      `${__dirname}/test-data/${sheetName} Configuration.csv`,
      "utf8"
    ),
    { header: true }
  ).data[0];
  dai = await daiArtifact.new();

  const buySlope = parseFraction(configJson.buy_slope);
  const investmentReserve = parsePercent(configJson.investment_reserve);
  const revenueCommitement = parsePercent(configJson.revenue_commitment);
  const fee = parsePercent(configJson.fee);
  [dat, fse] = await deployDat(
    {
      beneficiary,
      buySlopeNum: new BigNumber(buySlope[0]).toFixed(),
      buySlopeDen: new BigNumber(buySlope[1]).shiftedBy(18).toFixed(), // TODO is this right?
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
      currency: dai.address
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
    accounts[0]
  );
  const balanceJson = Papa.parse(
    fs.readFileSync(
      `${__dirname}/test-data/${sheetName} InitBalances.csv`,
      "utf8"
    ),
    { header: true }
  ).data;
  sheetJson = Papa.parse(
    fs.readFileSync(`${__dirname}/test-data/${sheetName} Script.csv`, "utf8"),
    { header: true }
  ).data;
  for (let i = 0; i < balanceJson.length; i++) {
    const row = balanceJson[i];
    await setBalanceAndApprove(parseInt(row.AccId), row.InitialBalance);
  }
  for (let i = 0; i < sheetJson.length; i++) {
    const row = sheetJson[i];
    console.log(row);
    const account = accounts[parseInt(row.AccId)];

    const fseBalance = new BigNumber(await fse.balanceOf(account));

    let quantity;
    let targetAddress;
    let isDai;
    if (row.Action === "buy") {
      quantity = parseNumber(row.BuyQty).shiftedBy(18);
      console.log(
        `Row ${i}: #${row.AccId} buy for $${quantity
          .shiftedBy(-18)
          .toFormat()} DAI`
      );
    } else if (row.Action === "sell") {
      quantity = parseNumber(row.SellQty).shiftedBy(18);
      if (quantity.plus(new BigNumber(1).shiftedBy(18)).gt(fseBalance)) {
        quantity = fseBalance;
      }
      console.log(
        `Row ${i}: #${row.AccId} sell ${quantity.shiftedBy(-18).toFormat()} FSE`
      );
    } else if (row.Action === "close") {
      console.log(`Row ${i}: #${row.AccId} close`);
    } else if (row.Action === "pay") {
      quantity = parseNumber(row.BuyQty).shiftedBy(18);
      console.log(
        `Row ${i}: #${row.AccId} pay $${quantity.shiftedBy(-18).toFormat()}`
      );
    } else if (row.Action === "xfer") {
      if (row.BuyQty) {
        isDai = true;
      }
      quantity = parseNumber(isDai ? row.BuyQty : row.SellQty).shiftedBy(18);
      targetAddress = accounts[parseInt(row.xferTargetAcc)];
      console.log(
        `Row ${i}: #${row.AccId} transfer $${quantity
          .shiftedBy(-18)
          .toFormat()} to #${parseInt(row.xferTargetAcc)}`
      );
    } else {
      throw new Error(`Missing action ${row.Action}`);
    }

    await logState("Before:", account);
    // pre-conditions
    await assertBalance(fse, account, row.PreviousFSEBal);
    await assertBalance(dai, account, row.PreviousDAIBal);

    // action
    if (row.Action === "buy") {
      if (account == beneficiary) {
        spentByBeneficiary = spentByBeneficiary.plus(quantity);
      }
      await dat.buy(
        account,
        quantity.toFixed(),
        1, //todoparseNumber(row.FSEDelta).shiftedBy(18),
        {
          from: account
        }
      );
    } else if (row.Action === "sell") {
      await dat.sell(
        quantity.toFixed(),
        1, //todoparseNumber(row.DAIDelta).shiftedBy(18),
        {
          from: account
        }
      );
    } else if (row.Action === "pay") {
      await dat.pay(quantity.toFixed(), { from: account });
    } else if (row.Action === "close") {
      await dat.close({ from: account });
      const daiBalanceAfter = new BigNumber(await dai.balanceOf(account));
      const exitFee = daiBalance.minus(daiBalanceAfter);
      spentByBeneficiary = spentByBeneficiary.plus(exitFee);
    } else if (row.Action === "xfer") {
      if (isDai) {
        await dai.transfer(targetAddress, quantity.toFixed(), {
          from: account
        });
      } else {
        await fse.transfer(targetAddress, quantity.toFixed(), {
          from: account
        });
      }
    } else {
      throw new Error(`Missing action ${row.Action}`);
    }

    await logState("After:", account);

    // post-conditions
    await assertBalance(fse, account, row.FSEBalanceOfAcct);
    await assertBalance(dai, account, row.DAIBalanceOfAcct);
    assertAlmostEqual(
      new BigNumber(await dai.balanceOf(beneficiary)).plus(spentByBeneficiary),
      parseNumber(row.TotalDAISentToBeneficiary).shiftedBy(18)
    );
    assertAlmostEqual(
      new BigNumber(await dai.balanceOf(feeCollector)),
      parseNumber(row.TotalDAISentToFeeCollector).shiftedBy(18)
    );
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
    assert.equal(await dat.state(), parseState(row.State));

    // TotalDAISentToBeneficiary
    // TotalDAISentToFeeCollector

    // TODO FSEDelta and DAIDelta via events
    // console.log(tx.receipt.rawLogs);
    // assert.equal(log.event, 'NameUpdated');
    // assert.equal(log.args._previousName, name);
    //console.log(`\tgot ${tokenValue.toFormat()} FSE`);

    // Confirming removal:
    // SellSlope (needed?)
    // PricePerFSE
    // BuyBackPrice
    // CmulatedInvest (how to confirm?)
    // ReserveVsInvest (how to cofirm?)
  }
}

async function logState(prefix, account) {
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
  const daiBalance = new BigNumber(await dai.balanceOf(account));
  const fseBalance = new BigNumber(await fse.balanceOf(account));
  const totalSupply = new BigNumber(await fse.totalSupply());
  const burnedSupply = new BigNumber(await fse.burnedSupply());
  const buybackReserve = new BigNumber(await dat.buybackReserve());
  const beneficiaryDaiBalance = new BigNumber(await dai.balanceOf(beneficiary));
  const beneficiaryFseBalance = new BigNumber(await fse.balanceOf(beneficiary));
  const feeCollectorDaiBalance = new BigNumber(
    await dai.balanceOf(feeCollector)
  );
  const feeCollectorFseBalance = new BigNumber(
    await fse.balanceOf(feeCollector)
  );
  console.log(`\t${prefix}\tState: ${state}
\t\tAccount: $${daiBalance
    .shiftedBy(-18)
    .toFormat()} DAI and ${fseBalance.shiftedBy(-18).toFormat()} FSE
\t\tSupply: ${totalSupply
    .shiftedBy(-18)
    .toFormat()} FSE + ${burnedSupply.shiftedBy(-18).toFormat()} burned
\t\tReserve: $${buybackReserve.shiftedBy(-18).toFormat()} DAI
\t\tBeneficiary: $${beneficiaryDaiBalance
    .shiftedBy(-18)
    .toFormat()} DAI ($${beneficiaryDaiBalance
    .plus(spentByBeneficiary)
    .shiftedBy(-18)
    .toFormat()} total sent) and ${beneficiaryFseBalance
    .shiftedBy(-18)
    .toFormat()} FSE
\t\tFee Collector: $${feeCollectorDaiBalance
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

async function setBalanceAndApprove(accountId, targetBalance) {
  targetBalance = parseNumber(targetBalance);
  console.log(
    `Set #${accountId} to $${targetBalance.toFormat()} DAI & approve dat`
  );
  const account = accounts[accountId];
  await dai.approve(dat.address, -1, { from: account });
  await dai.mint(account, targetBalance.shiftedBy(18).toFixed());
  const balance = new BigNumber(await dai.balanceOf(account)).shiftedBy(-18);
  assert.equal(balance.toFixed(), targetBalance.toFixed());

  if (account == beneficiary) {
    spentByBeneficiary = targetBalance.shiftedBy(18).times(-1);
  }

  // TODO for ETH support (but need to deal with gas costs as well - maybe detect and refund gas for simplicity?)
  // Also instead of burning it send it to a bank account and use an after block to reset balances
  // const currentBalance = new BigNumber(
  //   web3.utils.fromWei(await web3.eth.getBalance(account), "ether")
  // );
  // const burnAmount = currentBalance.minus(targetBalance);
  // console.log(
  //   `Current balance ${currentBalance.toFormat()}, target ${targetBalance.toFormat()}, burn ${burnAmount.toFormat()}`
  // );
  // await web3.eth.sendTransaction({
  //   from: account,
  //   to: constants.ZERO_ADDRESS,
  //   value: web3.utils.toWei(burnAmount.toFixed(), "ether")
  // });
  // const finalBalance = new BigNumber(await web3.eth.getBalance(account));
  // console.log(`Final balance ${finalBalance.toFormat()}`);
}
