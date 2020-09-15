const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const sell = require("./sell");

function all(control, beneficiary, investor) {
  burn(investor);
  buy(control, investor);
  close(beneficiary);
  sell(beneficiary, investor);
}

module.exports = {
  all,
  burn,
  buy,
  close,
  sell,
};
