const { deployDat, constants } = require("../helpers");
const Papa = require("papaparse");
const fs = require("fs");
const BigNumber = require("bignumber.js");

contract("dat / csvTests", accounts => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat({
      initGoal: "1000000000000000000000"
    });
    const configJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint Configuration.csv`,
        "utf8"
      )
    );
    const balanceJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint InitBalances.csv`,
        "utf8"
      ),
      { header: true }
    );
    const sheetJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint Script.csv`,
        "utf8"
      ),
      { header: true }
    );
    for (let i = 0; i < balanceJson.length; i++) {
      const row = balanceJson[i];
      await setBalance(accounts[parseInt(row.AccId)], row.InitialBalance);
    }
    console.log(configJson.data);
    console.log(sheetJson.data);
  });

  it("todo", async () => {});
});

async function setBalance(account, targetBalance) {
  console.log(`Set ${account} to ${targetBalance.toFixed()}`);
  targetBalance = new BigNumber(targetBalance);
  const currentBalance = new BigNumber(
    web3.eth.fromWei(await web3.eth.getBalance(account), "ether")
  );
  const burnAmount = targetBalance.minus(currentBalance);
  console.log(
    `Current balance ${currentBalance.toFixed()}, target ${targetBalance.toFixed()}, burn ${burnAmount.toFixed()}`
  );
  await web3.eth.sendTransaction({
    from: account,
    to: constants.ZERO_ADDRESS,
    value: web3.eth.toWei(burnAmount.toFixed(), "ether")
  });
  const finalBalance = new BigNumber(await web3.eth.getBalance(account));
  console.log(`Final balance ${finalBalance.toFixed()}`);
}
