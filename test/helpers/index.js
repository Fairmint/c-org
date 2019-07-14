const constants = require("./constants");
const getGasCost = require("./getGasCost");
const shouldFail = require("./shouldFail");
const globalHelpers = require("../../helpers");

module.exports = Object.assign(
  { constants, getGasCost, shouldFail },
  globalHelpers
);
