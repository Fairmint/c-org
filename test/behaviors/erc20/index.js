const burn = require("./burn");
const burnFrom = require("./burnFrom");
const decimals = require("./decimals");
const totalSupply = require("./totalSupply");
const transfer = require("./transfer");
const transferFrom = require("./transferFrom");

function all(tokenOwner, nonTokenHolder, operator) {
  burn(tokenOwner);
  burnFrom(tokenOwner, operator);
  decimals();
  totalSupply(tokenOwner);
  transfer(tokenOwner, nonTokenHolder);
  transferFrom(tokenOwner, nonTokenHolder, operator);
}

module.exports = {
  all,
  burn,
  burnFrom,
  decimals,
  totalSupply,
  transfer,
  transferFrom,
};
