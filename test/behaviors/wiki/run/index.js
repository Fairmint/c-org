const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const closeWithMinDuration = require("./closeWithMinDuration");
const sell = require("./sell");
const sellWith0GoalAndReserve = require("./sellWith0GoalAndReserve");

function all(control, beneficiary, investors) {
  burn(investors[0]);
  buy(investors[0]);
  close(control, investors[0]);
  sell(beneficiary, investors);
}

function allWithMinDuration(beneficiary, investors) {
  burn(investors[0]);
  buy(investors[0]);
  closeWithMinDuration();
  sell(beneficiary, investors);
}

function allWith0GoalAndReserve(beneficiary, investors) {
  sellWith0GoalAndReserve(beneficiary, investors);
}

module.exports = {
  all,
  allWithMinDuration,
  allWith0GoalAndReserve,
  burn,
  buy,
  close,
  closeWithMinDuration,
  sell,
  sellWith0GoalAndReserve,
};
