const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const sell = require("./sell");

function all(investor) {
  //burn(investor);
  //buy(investor);
  close();
  // sell();
}

module.exports = {
  all,
  burn,
  buy,
  close,
  sell,
};
