/* eslint-disable @typescript-eslint/no-var-requires */
let csv = require('csvtojson');
let xray = require('aws-xray-sdk-core');

module.exports = {
  csv,
  XRay: xray,
};
