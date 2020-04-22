const approveAll = require("./approveAll");
const constants = require("./constants");
const getGasCost = require("./getGasCost");
const globalHelpers = require("../../helpers");

module.exports = Object.assign(
  { approveAll, constants, getGasCost },
  globalHelpers
);
