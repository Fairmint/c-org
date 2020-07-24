const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const sell = require("./sell");

function all(beneficiary, investor) {
  burn(investor);
  buy(investor);
  close();
  sell(beneficiary, investor);
}

module.exports = {
  all,
  burn,
  buy,
  close,
  sell,
};
