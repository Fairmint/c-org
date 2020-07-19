const approve = require("./approve");
const balanceOf = require("./balanceOf");
const burn = require("./burn");
const burnFrom = require("./burnFrom");
const decimals = require("./decimals");
const mint = require("./mint");
const name = require("./name");
const permit = require("./permit");
const symbol = require("./symbol");
const totalSupply = require("./totalSupply");
const transfer = require("./transfer");
const transferFrom = require("./transferFrom");

function all(tokenOwner, nonTokenHolder, operator) {
  approve(tokenOwner, operator);
  balanceOf(tokenOwner, nonTokenHolder);
  burn(tokenOwner);
  burnFrom(tokenOwner, operator);
  decimals();
  mint(tokenOwner, nonTokenHolder, operator);
  name();
  permit(operator);
  symbol();
  totalSupply(tokenOwner);
  transfer(tokenOwner, nonTokenHolder);
  transferFrom(tokenOwner, nonTokenHolder, operator);
}

module.exports = {
  all,
  approve,
  balanceOf,
  burn,
  burnFrom,
  decimals,
  mint,
  name,
  permit,
  symbol,
  totalSupply,
  transfer,
  transferFrom,
};
