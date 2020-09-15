const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const closeWithMinDuration = require("./closeWithMinDuration");
const closeWithHighReserve = require("./closeWithHighReserve");
const sell = require("./sell");
const sellWith0GoalAndReserve = require("./sellWith0GoalAndReserve");

function all(control, beneficiary, investors) {
  burn(investors[0]);
  buy(investors[0]);
  close(control, investors[0]);
  sell(beneficiary, investors);
}

function allWithMinDuration(control, beneficiary, investors) {
  burn(investors[0]);
  buy(investors[0]);
  closeWithMinDuration();
  sell(beneficiary, investors);
}

function allWithHighReserve(control, beneficiary, investors) {
  burn(investors[0]);
  buy(investors[0]);
  closeWithHighReserve();
  sell(beneficiary, investors);
}

function allWith0GoalAndReserve(control, beneficiary, investors) {
  burn(investors[0]);
  buy(investors[0]);
  close(control, investors[0]);
  sellWith0GoalAndReserve(beneficiary, investors);
}

module.exports = {
  all,
  allWithMinDuration,
  allWithHighReserve,
  allWith0GoalAndReserve,
  burn,
  buy,
  close,
  closeWithMinDuration,
  closeWithHighReserve,
  sell,
  sellWith0GoalAndReserve,
};
