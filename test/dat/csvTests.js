const { deployDat } = require("../helpers");
const Papa = require("papaparse");
const fs = require("fs");
const BigNumber = require("bignumber.js");

const daiArtifact = artifacts.require("TestDai");

let dai;
let dat;
let fse;
let sheetJson;

contract("dat / csvTests", accounts => {
  before(async () => {
    const configJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint Configuration.csv`,
        "utf8"
      ),
      { header: true }
    ).data[0];
    dai = await daiArtifact.new();

    const buySlope = parseFraction(configJson.buy_slope);
    const investmentReserve = parsePercent(configJson.investment_reserve);
    const revenueCommitement = parsePercent(configJson.revenue_commitment);
    const fee = parsePercent(configJson.fee);
    [dat, fse] = await deployDat({
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
      feeNum: new BigNumber(fee[0]).toFixed(),
      feeDen: new BigNumber(fee[1]).toFixed(),
      currency: dai.address
    });
    const balanceJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint InitBalances.csv`,
        "utf8"
      ),
      { header: true }
    ).data;
    sheetJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint Script.csv`,
        "utf8"
      ),
      { header: true }
    ).data;
    for (let i = 0; i < balanceJson.length; i++) {
      const row = balanceJson[i];
      await setBalanceAndApprove(
        accounts[parseInt(row.AccId)],
        row.InitialBalance
      );
    }
  });

  it.only("todo", async () => {
    for (let i = 0; i < sheetJson.length; i++) {
      const row = sheetJson[i];
      console.log(row);
      const account = accounts[parseInt(row.AccId)];

      // pre-conditions
      const fseBefore = await assertBalance(fse, account, row.PreviousFSEBal);
      const daiBefore = await assertBalance(dai, account, row.PreviousDAIBal);

      // action
      if (row.Action === "buy") {
        const quantity = parseNumber(row.BuyQty).shiftedBy(18);
        console.log(
          `${account} buy for $${quantity
            .shiftedBy(-18)
            .toFormat()} DAI; balance before: $${daiBefore
            .shiftedBy(-18)
            .toFormat()} DAI and ${fseBefore.shiftedBy(-18).toFormat()} FSE`
        );
        await dat.buy(
          account,
          quantity.toFixed(),
          1, //todoparseNumber(row.FSEDelta).shiftedBy(18),
          {
            from: account
          }
        );
      } else if (row.Action === "sell") {
        const quantity = parseNumber(row.SellQty).shiftedBy(18);
        console.log(
          `${account} sell ${quantity.shiftedBy(-18).toFormat()} FSE`
        );
        await dat.sell(
          quantity.toFixed(),
          1, //todoparseNumber(row.DAIDelta).shiftedBy(18),
          {
            from: account
          }
        );
      } else {
        throw new Error(`Missing action ${row.Action}`);
      }

      // post-conditions
      await assertBalance(fse, account, row.FSEBalanceOfAcct);
      await assertBalance(dai, account, row.DAIBalanceOfAcct);
      assert.equal(
        new BigNumber(await fse.totalSupply()).toFixed(),
        parseNumber(row.FSETotalSupply)
          .shiftedBy(18)
          .toFixed()
      );
      assert.equal(
        new BigNumber(await fse.burnedSupply()).toFixed(),
        parseNumber(row.FSEBurnedSupply)
          .shiftedBy(18)
          .toFixed()
      );
      assert.equal(
        new BigNumber(await dat.buybackReserve()).toFixed(),
        parseNumber(row.DAIBuybackReserve)
          .shiftedBy(18)
          .toFixed()
      );
      assert.equal(await dat.state(), parseState(row.State));

      // TotalDAISentToBeneficiary
      // TotalDAISentToFeeCollector
      // SellSlope (needed?)
      // PricePerFSE
      // BuyBackPrice
      // CmulatedInvest (how to confirm?)
      // ReserveVsInvest (how to cofirm?)

      // TODO FSEDelta and DAIDelta via events
      // console.log(tx.receipt.rawLogs);
      // assert.equal(log.event, 'NameUpdated');
      // assert.equal(log.args._previousName, name);
      //console.log(`\tgot ${tokenValue.toFormat()} FSE`);
    }
  });
});

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

async function assertBalance(token, account, expectedBalance) {
  expectedBalance = parseNumber(expectedBalance).shiftedBy(18);
  const balance = new BigNumber(await token.balanceOf(account));
  assert.equal(
    balance
      .div(100)
      .dp(0)
      .toFixed(),
    expectedBalance
      .div(100)
      .dp(0)
      .toFixed()
  );
  return balance;
}

async function setBalanceAndApprove(account, targetBalance) {
  targetBalance = parseNumber(targetBalance);
  console.log(
    `Set ${account} to $${targetBalance.toFormat()} DAI & approve dat`
  );
  await dai.approve(dat.address, -1, { from: account });
  await dai.mint(account, targetBalance.shiftedBy(18).toFixed());
  const balance = new BigNumber(await dai.balanceOf(account)).shiftedBy(-18);
  assert.equal(balance.toFixed(), targetBalance.toFixed());

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
