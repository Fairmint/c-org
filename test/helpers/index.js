const constants = require("./constants");
const deployDat = require("./deployDat");
const getGasCost = require("./getGasCost");
const shouldFail = require("./shouldFail");
const updateFairConfig = require("./updateFairConfig");
const globalHelpers = require("../../helpers");

module.exports = Object.assign(
  { constants, deployDat, getGasCost, shouldFail, updateFairConfig },
  globalHelpers
);
