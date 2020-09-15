const burn = require("./burn");
const buy = require("./buy");
const buyWithSetupFee = require("./buyWithSetupFee");
const close = require("./close");
const sell = require("./sell");

function allWithoutSetupFee(control, beneficiary, investors, nonTokenHolder) {
  burn(investors[0]);
  buy(control, beneficiary, investors, nonTokenHolder);
  close(beneficiary);
  sell(beneficiary, investors[0]);
}

function allWithSetupFee(beneficiary, investors, setupFeeRecipient) {
  burn(investors[0]);
  buyWithSetupFee(beneficiary, investors[0], setupFeeRecipient);
  close(beneficiary);
  sell(beneficiary, investors[0]);
}

module.exports = {
  allWithoutSetupFee,
  allWithSetupFee,
  burn,
  buy,
  buyWithSetupFee,
  close,
  sell,
};
