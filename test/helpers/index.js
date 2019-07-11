const constants = require("./constants");
const deployDat = require("./deployDat");
const getGasCost = require("./getGasCost");
const shouldFail = require("./shouldFail");
const globalHelpers = require("../../helpers");

module.exports = Object.assign(
  { constants, deployDat, getGasCost, shouldFail },
  globalHelpers
);
