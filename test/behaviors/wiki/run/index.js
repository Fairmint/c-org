const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const sell = require("./sell");

function all(control, beneficiary, investors, nonTokenHolder) {
  burn(investors[0]);
  buy(control, beneficiary, investors, nonTokenHolder);
  close(beneficiary);
  sell(beneficiary, investors[0]);
}

module.exports = {
  all,
  burn,
  buy,
  close,
  sell,
};
