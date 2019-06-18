const constants = require('./constants');
const deployDat = require('./deployDat');
const shouldFail = require('./shouldFail');
const globalHelpers = require('../../helpers');

module.exports = Object.assign({ constants, deployDat, shouldFail }, globalHelpers);
