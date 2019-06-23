const { deployDat } = require("../helpers");
const Papa = require("papaparse");

contract("dat / csvTests", accounts => {
  let dat;
  let fse;

  before(async () => {
    [dat, fse] = await deployDat({
      initGoal: "1000000000000000000000"
    });
    const configJson = Papa.parse(
      "./test-data/buy_sell_no-pre-mint Configuration.csv"
    );
    const balanceJson = Papa.parse(
      "./test-data/buy_sell_no-pre-mint InitBalances.csv",
      { headers: true }
    );
    const sheetJson = Papa.parse(
      "./test-data/buy_sell_no-pre-mint Script.csv",
      { headers: true }
    );
    console.log(configJson);
    console.log(balanceJson);
    console.log(sheetJson);
  });

  it("todo", async () => {});
});
