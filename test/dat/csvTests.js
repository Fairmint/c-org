const { deployDat } = require("../helpers");
const Papa = require("papaparse");
const fs = require("fs");

contract("dat / csvTests", accounts => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat({
      initGoal: "1000000000000000000000"
    });
    const configJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint Configuration.csv`
      )
    );
    const balanceJson = Papa.parse(
      fs.readFileSync(
        `${__dirname}/test-data/buy_sell_no-pre-mint InitBalances.csv`
      ),
      { headers: true }
    );
    const sheetJson = Papa.parse(
      fs.readFileSync(`${__dirname}/test-data/buy_sell_no-pre-mint Script.csv`),
      { headers: true }
    );
    console.log(configJson.data);
    console.log(balanceJson.data);
    console.log(sheetJson.data);
  });

  it("todo", async () => {});
});
