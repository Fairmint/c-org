const burn = require("./burn");
const buy = require("./buy");
const close = require("./close");
const sell = require("./sell");

function all(
  beneficiary,
  investor,
  nonTokenHolder,
  operator,
  areTransactionsFrozen
) {
  burn(investor);
  buy(investor);
  close(investor, nonTokenHolder, operator, areTransactionsFrozen);
  sell(beneficiary, investor, areTransactionsFrozen);
}

module.exports = {
  all,
  burn,
  buy,
  close,
  sell,
};
